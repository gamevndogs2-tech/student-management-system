
const express = require('express');
const db = require('../config/database');
const { allowRoles } = require('../middleware/auth');

const router = express.Router();

router.use(allowRoles('teacher'));

// Lấy thông tin giáo viên và danh sách phân công
router.get('/assignments', async (req, res) => {
  try {
    const teacherId = req.session.user.teacher_id;

    if (!teacherId) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản chưa liên kết giáo viên'
      });
    }

    const [rows] = await db.query(`
      SELECT
        ta.id,
        ta.class_id,
        ta.subject_id,
        t.teacher_code,
        t.full_name AS teacher_name,
        c.class_name,
        s.subject_name,
        s.credits
      FROM teacher_assignments ta
      JOIN teachers t ON t.id = ta.teacher_id
      JOIN classes c ON c.id = ta.class_id
      JOIN subjects s ON s.id = ta.subject_id
      WHERE ta.teacher_id = ?
      ORDER BY c.class_name, s.subject_name
    `, [teacherId]);

    res.json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải phân công'
    });
  }
});

// Danh sách sinh viên và điểm theo phân công
router.get('/assignments/:id/students', async (req, res) => {
  try {
    const teacherId = req.session.user.teacher_id;
    const assignmentId = Number(req.params.id);

    if (!teacherId || !Number.isInteger(assignmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin phân công không hợp lệ'
      });
    }

    const [assignments] = await db.query(`
      SELECT class_id, subject_id
      FROM teacher_assignments
      WHERE id = ? AND teacher_id = ?
    `, [assignmentId, teacherId]);

    if (!assignments.length) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không được phân công lớp/môn này'
      });
    }

    const { class_id, subject_id } = assignments[0];

    const [students] = await db.query(`
      SELECT
        st.id,
        st.student_code,
        st.full_name,
        g.process_score,
        g.exam_score
      FROM students st
      LEFT JOIN grades g
        ON g.student_id = st.id
        AND g.subject_id = ?
      WHERE st.class_id = ?
      ORDER BY st.student_code
    `, [subject_id, class_id]);

    res.json({
      success: true,
      total: students.length,
      data: students
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách sinh viên'
    });
  }
});

// Nhập hoặc cập nhật điểm
router.put('/assignments/:id/students/:studentId/grade', async (req, res) => {
  try {
    const teacherId = req.session.user.teacher_id;
    const assignmentId = Number(req.params.id);
    const studentId = Number(req.params.studentId);

    const { process_score, exam_score } = req.body;

    if (
      !teacherId ||
      !Number.isInteger(assignmentId) || assignmentId <= 0 ||
      !Number.isInteger(studentId) || studentId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin không hợp lệ'
      });
    }

    const validScore = value =>
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 10;

    if (!validScore(process_score) || !validScore(exam_score)) {
      return res.status(400).json({
        success: false,
        message: 'Điểm phải là số từ 0 đến 10'
      });
    }

    const [rows] = await db.query(`
      SELECT ta.subject_id
      FROM teacher_assignments ta
      JOIN students st
        ON st.class_id = ta.class_id
      WHERE ta.id = ?
        AND ta.teacher_id = ?
        AND st.id = ?
    `, [assignmentId, teacherId, studentId]);

    if (!rows.length) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền nhập điểm sinh viên này'
      });
    }

    const subjectId = rows[0].subject_id;

    await db.query(`
      INSERT INTO grades
        (student_id, subject_id, process_score, exam_score)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        process_score = VALUES(process_score),
        exam_score = VALUES(exam_score)
    `, [studentId, subjectId, process_score, exam_score]);

    res.json({
      success: true,
      message: 'Lưu điểm thành công'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Không thể lưu điểm'
    });
  }
});

module.exports = router;

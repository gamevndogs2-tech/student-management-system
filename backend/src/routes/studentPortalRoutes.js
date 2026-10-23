
const express = require('express');
const db = require('../config/database');
const { allowRoles } = require('../middleware/auth');

const router = express.Router();

router.use(allowRoles('student'));

// Hồ sơ cá nhân
router.get('/profile', async (req, res) => {
  try {
    const studentId = req.session.user.student_id;

    if (!studentId) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản chưa liên kết sinh viên'
      });
    }

    const [rows] = await db.query(`
      SELECT
        st.id,
        st.student_code,
        st.full_name,
        st.date_of_birth,
        st.gender,
        st.email,
        c.class_code,
        c.class_name,
        c.academic_year
      FROM students st
      LEFT JOIN classes c ON c.id = st.class_id
      WHERE st.id = ?
    `, [studentId]);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải hồ sơ'
    });
  }
});

// Bảng điểm cá nhân
router.get('/grades', async (req, res) => {
  try {
    const studentId = req.session.user.student_id;

    if (!studentId) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản chưa liên kết sinh viên'
      });
    }

    const [rows] = await db.query(`
      SELECT
        s.subject_code,
        s.subject_name,
        s.credits,
        g.process_score,
        g.exam_score
      FROM grades g
      JOIN subjects s ON s.id = g.subject_id
      WHERE g.student_id = ?
      ORDER BY s.subject_name
    `, [studentId]);

    const data = rows.map(row => {
      const process = Number(row.process_score);
      const exam = Number(row.exam_score);
      const final = process * 0.4 + exam * 0.6;

      let gradePoint = 0;

      if (final >= 8.5) gradePoint = 4;
      else if (final >= 8) gradePoint = 3.5;
      else if (final >= 7) gradePoint = 3;
      else if (final >= 6.5) gradePoint = 2.5;
      else if (final >= 5.5) gradePoint = 2;
      else if (final >= 5) gradePoint = 1.5;
      else if (final >= 4) gradePoint = 1;

      return {
        ...row,
        final_score: Number(final.toFixed(2)),
        grade_point: gradePoint
      };
    });

    const totalCredits = data.reduce(
      (sum, row) => sum + Number(row.credits), 0
    );

    const weightedPoints = data.reduce(
      (sum, row) =>
        sum + row.grade_point * Number(row.credits), 0
    );

    const gpa = totalCredits
      ? Number((weightedPoints / totalCredits).toFixed(2))
      : null;

    res.json({
      success: true,
      total: data.length,
      gpa,
      data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải bảng điểm'
    });
  }
});

module.exports = router;

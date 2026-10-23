
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Kiểm tra ID hợp lệ
const validId = (id) =>
  /^[1-9]\d*$/.test(String(id));

// Kiểm tra điểm từ 0 đến 10
const validScore = (score) =>
  score === null ||
  (typeof score === 'number' &&
    Number.isFinite(score) &&
    score >= 0 &&
    score <= 10);

// GET - Danh sách điểm
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        g.id,
        g.student_id,
        s.student_code,
        s.full_name,
        g.subject_id,
        sub.subject_code,
        sub.subject_name,
        g.process_score,
        g.exam_score
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN subjects sub ON g.subject_id = sub.id
      ORDER BY g.id DESC
    `);

    res.json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách điểm'
    });
  }
});

// GET - Điểm theo sinh viên
router.get('/student/:studentId', async (req, res) => {
  if (!validId(req.params.studentId)) {
    return res.status(400).json({
      success: false,
      message: 'ID sinh viên không hợp lệ'
    });
  }

  try {
    const [rows] = await db.query(`
      SELECT
        g.id,
        g.student_id,
        g.subject_id,
        sub.subject_code,
        sub.subject_name,
        g.process_score,
        g.exam_score
      FROM grades g
      JOIN subjects sub ON g.subject_id = sub.id
      WHERE g.student_id = ?
      ORDER BY sub.subject_name
    `, [req.params.studentId]);

    res.json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy điểm sinh viên'
    });
  }
});

// GET - Chi tiết một bản ghi điểm
router.get('/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'ID điểm không hợp lệ'
    });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM grades WHERE id = ?',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy điểm'
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
      message: 'Không thể lấy chi tiết điểm'
    });
  }
});

// POST - Thêm điểm
router.post('/', async (req, res) => {
  const {
    student_id,
    subject_id,
    process_score,
    exam_score
  } = req.body;

  if (
    !Number.isSafeInteger(student_id) ||
    student_id <= 0 ||
    !Number.isSafeInteger(subject_id) ||
    subject_id <= 0 ||
    !validScore(process_score) ||
    !validScore(exam_score) ||
    process_score === undefined ||
    exam_score === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: 'Thông tin điểm không hợp lệ'
    });
  }

  try {
    const [result] = await db.query(`
      INSERT INTO grades
        (student_id, subject_id, process_score, exam_score)
      VALUES (?, ?, ?, ?)
    `, [
      student_id,
      subject_id,
      process_score,
      exam_score
    ]);

    res.status(201).json({
      success: true,
      message: 'Thêm điểm thành công',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error(error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Sinh viên đã có điểm môn học này'
      });
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        message: 'Sinh viên hoặc môn học không tồn tại'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Không thể thêm điểm'
    });
  }
});

// PUT - Cập nhật điểm
router.put('/:id', async (req, res) => {
  const { process_score, exam_score } = req.body;

  if (
    !validId(req.params.id) ||
    process_score === undefined ||
    exam_score === undefined ||
    !validScore(process_score) ||
    !validScore(exam_score)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Thông tin điểm không hợp lệ'
    });
  }

  try {
    const [result] = await db.query(`
      UPDATE grades
      SET process_score = ?, exam_score = ?
      WHERE id = ?
    `, [process_score, exam_score, req.params.id]);

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy điểm'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật điểm thành công'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật điểm'
    });
  }
});

// DELETE - Xóa điểm
router.delete('/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'ID điểm không hợp lệ'
    });
  }

  try {
    const [result] = await db.query(
      'DELETE FROM grades WHERE id = ?',
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy điểm'
      });
    }

    res.json({
      success: true,
      message: 'Xóa điểm thành công'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa điểm'
    });
  }
});

module.exports = router;


const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET - Danh sách sinh viên
router.get('/', async (req, res) => {
  try {
    const [students] = await db.query(`
      SELECT s.*, c.class_code, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      ORDER BY s.id DESC
    `);

    res.json({
      success: true,
      total: students.length,
      data: students
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách sinh viên'
    });
  }
});

// GET - Chi tiết sinh viên
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, c.class_code, c.class_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên'
      });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông tin sinh viên'
    });
  }
});

// POST - Thêm sinh viên
router.post('/', async (req, res) => {
  try {
    const {
      student_code, full_name, date_of_birth,
      gender, email, class_id
    } = req.body;

    if (!student_code || !full_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã sinh viên, họ tên hoặc email'
      });
    }

    const [result] = await db.query(
      `INSERT INTO students
       (student_code, full_name, date_of_birth,
        gender, email, class_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        student_code, full_name, date_of_birth || null,
        gender || null, email, class_id || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Thêm sinh viên thành công',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error(error);

    res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({
      success: false,
      message: error.code === 'ER_DUP_ENTRY'
        ? 'Mã sinh viên hoặc email đã tồn tại'
        : 'Không thể thêm sinh viên'
    });
  }
});

// PUT - Cập nhật sinh viên
router.put('/:id', async (req, res) => {
  try {
    const {
      student_code, full_name, date_of_birth,
      gender, email, class_id
    } = req.body;

    if (!student_code || !full_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
    }

    const [result] = await db.query(
      `UPDATE students SET
       student_code = ?, full_name = ?,
       date_of_birth = ?, gender = ?,
       email = ?, class_id = ?
       WHERE id = ?`,
      [
        student_code, full_name, date_of_birth || null,
        gender || null, email, class_id || null,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật sinh viên thành công'
    });
  } catch (error) {
    console.error(error);

    res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({
      success: false,
      message: error.code === 'ER_DUP_ENTRY'
        ? 'Mã sinh viên hoặc email đã tồn tại'
        : 'Không thể cập nhật sinh viên'
    });
  }
});

// DELETE - Xóa sinh viên
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM students WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên'
      });
    }

    res.json({
      success: true,
      message: 'Xóa sinh viên thành công'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa sinh viên'
    });
  }
});

module.exports = router;

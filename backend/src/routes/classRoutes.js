
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Kiểm tra dữ liệu lớp học
function validateClass(body) {
  const { class_code, class_name, academic_year } = body || {};

  if (
    typeof class_code !== 'string' ||
    typeof class_name !== 'string' ||
    !class_code.trim() ||
    !class_name.trim() ||
    class_code.trim().length > 20 ||
    class_name.trim().length > 100 ||
    (academic_year != null &&
      (typeof academic_year !== 'string' ||
       academic_year.trim().length > 20))
  ) {
    return null;
  }

  return {
    class_code: class_code.trim(),
    class_name: class_name.trim(),
    academic_year: academic_year?.trim() || null
  };
}

// GET - Lấy danh sách lớp học
router.get('/', async (req, res) => {
  try {
    const [classes] = await db.query(
      'SELECT * FROM classes ORDER BY id DESC'
    );

    res.status(200).json({
      success: true,
      total: classes.length,
      data: classes
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách lớp:', error.message);

    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách lớp học'
    });
  }
});

// POST - Thêm lớp học
router.post('/', async (req, res) => {
  try {
    const data = validateClass(req.body);

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin lớp học không hợp lệ'
      });
    }

    const [result] = await db.query(
      `INSERT INTO classes
       (class_code, class_name, academic_year)
       VALUES (?, ?, ?)`,
      [
        data.class_code,
        data.class_name,
        data.academic_year
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Thêm lớp học thành công',
      data: {
        id: result.insertId,
        ...data
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Mã lớp đã tồn tại'
      });
    }

    console.error('Lỗi thêm lớp:', error.message);

    res.status(500).json({
      success: false,
      message: 'Không thể thêm lớp học'
    });
  }
});

// PUT - Cập nhật lớp học
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = validateClass(req.body);

    if (
      !/^[1-9]\d*$/.test(id) ||
      !Number.isSafeInteger(Number(id))
    ) {
      return res.status(400).json({
        success: false,
        message: 'ID lớp học không hợp lệ'
      });
    }

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin lớp học không hợp lệ'
      });
    }

    const [result] = await db.query(
      `UPDATE classes
       SET class_code = ?,
           class_name = ?,
           academic_year = ?
       WHERE id = ?`,
      [
        data.class_code,
        data.class_name,
        data.academic_year,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật lớp học thành công',
      data: {
        id: Number(id),
        ...data
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Mã lớp đã tồn tại'
      });
    }

    console.error('Lỗi cập nhật lớp:', error.message);

    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật lớp học'
    });
  }
});

// DELETE - Xóa lớp học
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (
      !/^[1-9]\d*$/.test(id) ||
      !Number.isSafeInteger(Number(id))
    ) {
      return res.status(400).json({
        success: false,
        message: 'ID lớp học không hợp lệ'
      });
    }

    const [result] = await db.query(
      'DELETE FROM classes WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Xóa lớp học thành công',
      data: {
        id: Number(id)
      }
    });
  } catch (error) {
    console.error('Lỗi xóa lớp:', error.message);

    res.status(500).json({
      success: false,
      message: 'Không thể xóa lớp học'
    });
  }
});

module.exports = router;

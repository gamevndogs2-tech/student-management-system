
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Đăng nhập chung: Admin, Giáo viên, Sinh viên
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tài khoản và mật khẩu'
      });
    }

    const [rows] = await db.query(
      `SELECT id, username, password_hash, role,
              student_id, teacher_id, is_active
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [username.trim()]
    );

    const user = rows[0];

    if (
      !user ||
      !user.is_active ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không đúng'
      });
    }

    // Tạo phiên đăng nhập mới, chống session fixation
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Không tạo được phiên đăng nhập'
        });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        student_id: user.student_id,
        teacher_id: user.teacher_id
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          return res.status(500).json({
            success: false,
            message: 'Không lưu được phiên đăng nhập'
          });
        }

        return res.json({
          success: true,
          message: 'Đăng nhập thành công',
          user: {
            username: user.username,
            role: user.role
          }
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống đăng nhập'
    });
  }
});

// Kiểm tra tài khoản đang đăng nhập
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.session.user
  });
});

// Đăng xuất
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Không đăng xuất được'
      });
    }

    res.clearCookie('connect.sid');

    return res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  });
});

module.exports = router;

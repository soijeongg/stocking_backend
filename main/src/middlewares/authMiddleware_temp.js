export default async function authMiddleware(req, res, next) {
  if (req.isAuthenticated()) {
    res.locals.user = req.user;
    if (req.user.isisVerified === false) {
      return res.status(400).json({ Message: '메일 인증을 해주세요' });
    }
    return next();
  } else {
    res.clearCookie('connect.sid'); // 세션 쿠키 이름이 'connect.sid'인 경우. 실제 쿠키 이름에 맞게 변경하세요.
    return res.status(401).json({ message: '인증이 필요합니다.' });
  }
}

// 소이님께서 만들어주시면 날리고 대체해야함.

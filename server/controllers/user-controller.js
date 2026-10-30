const userService = require('../service/user/user-service');
const { DatabaseError, IllegalArguementError } = require('../service/user/user-service-errors');

async function createUser(req, res) {
  const userName = req.body.userName;
  const password = req.body.password;

  try {
    userService.createUser(userName, password);
  } catch (err) {
    if (err instanceof DatabaseError) {
      res.status(500).json({error: err.message});
    } else if (err instanceof IllegalArguementError) {
      res.status(400).json({error: err.message});
    } else {
      res.status(500).json({error: "Something unexpected went wrong."})
    }
  }
}

async function login(req, res) {
  const {userName, password} = req.body;
  let profile;
  try {
    profile = userService.findUserByUserName(userName);
  } catch (err) {
    if (err instanceof DatabaseError) {
      res.status(500).json({error : err.message});
    } else {
      res.status(500).json({error : "Something unexpected went wrong"});
    }
  }

  if (profile == null) return res.status(404).json({error : "User not found."});

  const isCorrectPassword = await bcrypt.compare(password, profile.password);

  if (!isCorrectPassword) return res.status(401).json({error : "Wrong password."});

  req.session.user = {
    userName : profile.userName,
    skills : profile.skills,
    linkedinUrl : profile.linkedinUrl,
    githubUrl : profile.githubUrl
  };
  return res.status(200);
}

async function me(req, res) {
  if (req.session && req.session.user) {
    return res.json({
      isAuthenticated: true,
      user : req.session.user
    })
  };

  res.json({
    isAuthenticated : false,
    user: null
  });
}

async function updateUser(req, res) {
  const {newUserName, password, skills, linkedinUrl, githubUrl} = req.body;
  const oldUserName = req.session.user.userName;

  try {
    userService.updateUser(oldUserName, password, newUserName, skills, linkedinUrl, githubUrl);
  } catch (err) {
    if (err instanceof DatabaseError) {
      res.status(500).json({error: err.message});
    } else if (err instanceof IllegalArguementError) {
      res.status(400).json({error: err.message});
    } else {
      res.status(500).json({error: "Something unexpected went wrong."})
    }
  }

  return res.status(200);
}

async function deleteUser(req, res) {
  try {
    userService.deleteUserByUserName(req.body.user.userName);
  } catch (err) {
    if (err instanceof DatabaseError) {
      res.status(500).json({error : err.message});
    } else {
      res.status(500).json({error : "Something unexpected went wrong"});
    }
  }

  req.session.destory((err) => {
    if (err) {
      return res.status(500).json({error: 'Failed to log out'});
    };

    res.clearCookie('connect.sid', { path: '/'});

    return res.status(200);
  })
}

async function logout(req,res) {
  if (!req.session) return res.status(200);

  req.session.destory((err) => {
    if (err) {
      return res.status(500).json({error: 'Failed to log out'});
    };

    res.clearCookie('connect.sid', { path: '/'});

    return res.status(200);
  })
}


module.exports = {
  createUser,
  login,
  me,
  updateUser,
  deleteUser,
  logout
}
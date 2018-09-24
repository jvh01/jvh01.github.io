function GetUsersRequest(userIds) {
  return {
    msg: 'method',
    method: 'userService.getMultipleWithVisibleFields',
    params: [userIds]
  };
}

function GetUserProfileRequest(username) {
  return {
    msg: 'method',
    method: 'userService.getUserProfile',
    params: [username]
  };
}

module.exports = {
    GetUsersRequest,
    GetUserProfileRequest
};

function GetUsersRequest(userIds) {
  return {
    msg: 'method',
    method: 'userService.getMultipleWithVisibleFields',
    params: [userIds]
  };
}

module.exports = {
    GetUsersRequest,
};

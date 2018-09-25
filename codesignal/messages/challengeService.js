function GetDetailsRequest(challengeId) {
  return {
    msg: 'method',
    method: 'challengeService.getDetails',
    params: [challengeId, '']
  };
}

module.exports = {
    GetDetailsRequest,
};

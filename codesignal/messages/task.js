function GetSampleTestsByTaskIdRequest(taskId) {
  return {
    msg: 'method',
    method: 'Task.getSampleTests',
    params: [taskId, 'challenge']
  };
}

module.exports = {
    GetSampleTestsByTaskIdRequest,
};

function getAuthorizationHeader(req) {
  const authorization = req.header("Authorization");

  if (!authorization) {
    return {};
  }

  return {
    Authorization: authorization
  };
}

module.exports = {
  getAuthorizationHeader
};
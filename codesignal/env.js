const __ENV__ = process.env.ENV || 'dev';

const isProdEnv = () => __ENV__ == 'prod';

module.exports = {
    __ENV__,
    isProdEnv
};

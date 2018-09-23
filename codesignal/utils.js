function ellipsis(s, l) {
    if (s.length <= l) {
        return s;
    } else {
        return s.substring(0, l-3) + '...';
    }
};

module.exports = {
    ellipsis,
};

/** @type {import("@textlint/config-loader").TextlintRcConfig}*/
module.exports = {
  rules: {
    "preset-ja-technical-writing": true,
    "preset-ja-spacing": true,
    "@proofdict/proofdict": {
      dictURL: "https://azu.github.io/proof-dictionary/",
    },
  },
};

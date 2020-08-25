module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        corejs: 2,
        useBuiltIns: 'usage',
        // some novel features are enabled; e.g.,
        // - class private field
        // - class private method
        shippedProposals: true
      }
    ]
  ]
}

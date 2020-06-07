CodeMirror.defineMode('pro_eq', () => {
  return {
    token: (stream, state) => {
      if (stream.match(/[\dA-Za-z_]+\(/)) {
        return 'keyword'
      }
      stream.next()
      return null
    }
  }
})
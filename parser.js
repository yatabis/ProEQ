const identifier = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_".split('')
const is_newline = token => token === '\n'
const is_whitespace = token => token === ' '
const is_comma = token => token === ','
const is_colon = token => token === ':'
const is_equal = token => token === '='
const is_define = token => token === ':='
const is_parentheses_begin = token => token === '('
const is_parentheses_end = token => token === ')'
const is_parentheses = token => is_parentheses_begin(token) || is_parentheses_end(token)
const is_braces = token => token === '{' || token === '}'
const is_not_identifier = token => identifier.indexOf(token) === -1

class Lexer {
  constructor(input) {
    this.stream = input
    this.stack = ''
    this.token = []
    this.tokenize()
  }

  add_token() {
    if (this.stack !== '') {
      this.token.push(this.stack)
      this.stack = ''
    }
  }

  tokenize() {
    for (const s of this.stream) {
      if (is_whitespace(s)) {
        this.add_token()
      } else if (is_colon(s)) {
        this.add_token()
        this.stack += s
      } else if (is_equal(s) && this.stack === ':') {
        this.stack += s
        this.add_token()
      } else if (is_comma(s) || is_parentheses(s) || is_braces(s) || is_not_identifier(s)) {
        this.add_token()
        this.token.push(s)
      } else {
        this.stack += s
      }
    }
    this.add_token()
  }
}

const NODE_TYPE = {
  text: 0,
  func: 1,
}

let user_functions = {}

class Node {
  constructor(type, name, params = []) {
    this.type = type
    this.name = name
    this.params = params
    this.tex = this.tex_string()
  }

  tex_string() {
    switch (this.type) {
      case NODE_TYPE.text:
        return this.name
      case NODE_TYPE.func:
        switch (function_type_table[this.name]) {
          case FUNCTION_TYPE.latex:
            let tex_string = '\\' + this.name
            for (const p of this.params) {
              tex_string += '{'
              tex_string += p
              tex_string += '}'
            }
            if (this.params.length === 0) {
              tex_string += ' '
            }
            return tex_string
          case FUNCTION_TYPE.proeq:
            return PROEQ_FUNCTIONS[this.name](this.params)
          case FUNCTION_TYPE.user:
            return user_functions[this.name](this.params)
        }
    }
  }
}

class Parser {
  constructor(token) {
    this.token = token
    this.num = this.token.length
    this.count = 0
    this.ast = ['']
    this.parse()
  }

  current() {
    return this.token[this.count]
  }

  next() {
    return this.token[this.count + 1]
  }

  break() {
    return is_newline(this.current()) || this.count >= this.num
  }

  parameter() {
    return this.expression()
  }

  parameter_list() {
    let params = []
    let stack = ''
    if (is_parentheses_begin(this.current())) {
      this.count++
    }
    while (!is_parentheses_end(this.current()) && !this.break()) {
      if (is_comma(this.current())) {
        params.push(stack)
        stack = ''
        this.count++
      } else {
        stack += this.parameter()
      }
    }
    if (stack !== '') {
      params.push(stack)
    }
    this.count++
    return params
  }

  function_call() {
    const function_name = this.current()
    this.count++
    const parameter_list = is_parentheses_begin(this.current()) ? this.parameter_list() : []
    const node = new Node(NODE_TYPE.func, function_name, parameter_list)
    return node.tex
  }

  raw_expression() {
    const node = new Node(NODE_TYPE.text, this.current())
    this.count++
    return node.tex
  }

  expression() {
    if (function_type_table[this.current()]) {
      return this.function_call()
    } else {
      return this.raw_expression()
    }
  }

  output() {
    while (!this.break()) {
      this.ast.push(this.expression())
    }
  }

  definition() {
    const name = this.current()
    this.count++
    this.count++
    let defined = []
    while (!this.break()) {
      defined.push(this.expression())
    }
    user_functions[name] = () => defined.join(' ')
    function_type_table[name] = FUNCTION_TYPE.user
  }

  line() {
    let now = this.count
    let is_definition = false
    while (!this.break()) {
      if (is_define(this.current())) {
        is_definition = true
        break
      }
      this.count++
    }
    this.count = now
    if (is_definition) {
      this.definition()
    } else {
      this.output()
      if (is_newline(this.current())) {
        this.ast.push('\\\\')
      }
    }
    this.count++
  }

  input() {
    while (this.count < this.num) {
      this.line()
    }
  }

  parse() {
    this.input()
  }
}

const pro_eq = (input) => {
  user_functions = {}
  refresh_function_table()
  const lexer = new Lexer(input)
  // console.log(lexer.token)
  const parser = new Parser(lexer.token)
  // console.log(parser.ast)
  return parser.ast.join(' ')
}

const app = new Vue({
  el: '#app',
  data: {
    raw_text: 'e := mathrm(e)\n' + 'i := mathrm(i)\n' + 'e^{i theta} = cos(theta) + i sin(theta)\nlim(n, infty, sum(k = 0, n, a cdot r^k)) = frac(a, 1 - r) quad par(|r| < 1)',
  },
  computed: {
    tex_text: function() {
      return pro_eq(this.raw_text)
    },
  },
  mounted: function () {
    document.getElementById('math').innerText = '$$' + this.tex_text + '$$'
    MathJax.Hub.Queue(['Typeset', MathJax.Hub, 'math'])
  },
  updated: function () {
    document.getElementById('math').innerText = '$$' + this.tex_text + '$$'
    MathJax.Hub.Queue(['Typeset', MathJax.Hub, 'math'])
  }
})

$('#btn-copy').click(function() {
  document.getSelection().removeAllRanges()
  document.getSelection().selectAllChildren(document.getElementById('tex'))
  document.execCommand('copy')
  const btn = $(this)
  btn.tooltip('show')
  setTimeout(function(){btn.tooltip('hide')}, 500)
  document.getSelection().removeAllRanges()
})

let editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
  mode: 'pro_eq',
  value: document.getElementById('editor').value,
  lineNumbers: true,
  lineWrapping: true,
  indentUnit: 4,
  autoCloseBrackets: true,
})
editor.setSize('100%', '100%')
editor.on('change', function () {
  app.raw_text = editor.getValue()
})

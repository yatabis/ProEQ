const identifier = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split('')
const is_whitespace = token => token === ' '
const is_comma = token => token === ','
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

const large_operations = {
  par: (token) => `\\left( ${token.join(' ')} \\right)`,
  sum: (token) => `\\sum${token.length>1 ? `_{${token[1]}}` : ''}${token.length>2 ? `^{${token[2]}}` : ''}{${token[0]}}`,
  int: (token) => `\\int${token.length>1 ? `_{${token[1]}}` : ''}${token.length>2 ? `^{${token[2]}}` : ''}{${token[0]}}`,
  lim: (token) => `\\lim${token.length>1 ? `_{${token[1]}}` : ''}{${token[0]}}`,
}

let user_defined = {}

const local_functions = {...large_operations, ...user_defined}

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
        if (this.name in local_functions) {
          return local_functions[this.name](this.params)
        } else {
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

  parameter() {
    return this.expression()
  }

  parameter_list() {
    let params = []
    let stack = ''
    while (this.count < this.num && !is_parentheses_end(this.current())) {
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
    return params
  }

  function_call() {
    const function_name = this.current()
    this.count++
    this.count++
    const node = new Node(NODE_TYPE.func, function_name, this.parameter_list())
    this.count++
    return node.tex
  }

  raw_expression() {
    const node = new Node(NODE_TYPE.text, this.current())
    this.count++
    return node.tex
  }

  expression() {
    if (is_parentheses_begin(this.next())) {
      return this.function_call()
    } else {
      return this.raw_expression()
    }
  }

  output() {
    while (this.count < this.num) {
      this.ast.push(this.expression())
    }
  }

  parse() {
    this.output()
  }
}

const pro_eq = (input) => {
  const lexer = new Lexer(input)
  // console.log(lexer.token)
  const parser = new Parser(lexer.token)
  return parser.ast.join(' ')
}


const app = new Vue({
  el: '#app',
  data: {
    raw_text: '',
  },
  computed: {
    tex_text: function() {
      return pro_eq(this.raw_text)
    },
  },
  updated: function () {
    document.getElementById('math').innerText = '$$' + this.tex_text + '$$'
    MathJax.Hub.Queue(['Typeset', MathJax.Hub, 'math'])
  }
})
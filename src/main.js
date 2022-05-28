

const program = require('commander')
const { version } = require('./constant')
const path = require('path')
// program.parse(process.argv)

const mapActions = {
  create: {
    alias: 'c',
    description: 'create a project',
    examples: [
      'cpma-cli create <project-name>'
    ]
  },
  config: {
    alias: 'conf',
    description: 'create a project',
    examples: [
      'cpma-cli config xx'
    ]
  },
  '*': {
    alias: '',
    description: 'command not found',
    examples: []
  }
}
Reflect.ownKeys(mapActions).forEach(action => {
  program.command(action)
    .alias(mapActions[action].alias)
    .description(mapActions[action].description)
    .action(() => {
      if (action === '*') {
        console.log(mapActions[action].description)
      } else {
        // console.log(action)
        // cpma-cli create xxx  [node,cpma-cli,create,...]
        require(path.resolve(__dirname,action))(...process.argv.slice(3))
      }
    })
})

program.on('--help', () => {
  console.log('\nExample:')
  Reflect.ownKeys(mapActions).forEach(action => {
    mapActions[action].examples.forEach(example => {
      console.log(`  ${example}`)
    })
  })
})










program.version(version).parse(process.argv)




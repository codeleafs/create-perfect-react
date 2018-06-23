#!/usr/bin/env node
'use strict'
const packageJson = require('../package.json')
const commander = require('commander')
const chalk = require('chalk')
const createPerfectReact = require('./createPerfectReact')

let projectName
const program = new commander.Command(packageJson.name)
  .version(packageJson.json)
  .arguments('<project-directory>')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .action(name => {
    projectName = name
  })
  .on('--help', () => {
    console.log(`    ${chalk.green('<project-directory>')} is required.`)
    console.log()
    console.log(
      `    If you have any problems, do not hesitate to file an issue:`
    )
    console.log(
      `      ${chalk.cyan(
        'https://github.com/codeleafs/create-perfect-react/issues/new'
      )}`
    )
    console.log()
  })
  .parse(process.argv)

if (!projectName) {
  console.error(chalk.red('Please specify the project directory:'))
  console.log(
    `  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}`
  )
  process.exit(1)
}

createPerfectReact(projectName)

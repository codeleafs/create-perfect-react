//    Copyright 2018 leaf
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

'use strict'
const chalk = require('chalk')
const exec = require('child_process').exec
const inquirer = require('inquirer')
const validateProjectName = require('validate-npm-package-name')
const spinner = require('ora')()
const fs = require('fs-extra')
const path = require('path')
const readline = require('readline')

async function init(name) {
  let distinct = name
  if (!distinct) {
    const { projectName } = await inquirer.prompt([
      {
        name: 'projectName',
        type: 'input',
        message: 'Project name: '
      }
    ])
    distinct = projectName
  }

  const current = distinct === '.'
  const projectName = current ? path.relative('../', process.cwd()) : distinct

  const result = validateProjectName(projectName)
  if (!result.validForNewPackages) {
    console.error(chalk.red(`Invalid project name: "${projectName}"`))
    result.errors &&
      result.errors.forEach(err => {
        console.error(chalk.red(err))
      })
    process.exit(1)
  }

  const targetDir = path.resolve(distinct)
  if (fs.existsSync(targetDir)) {
    if (process.stdout.isTTY) {
      const blank = '\n'.repeat(process.stdout.rows)
      console.log(blank)
      readline.cursorTo(process.stdout, 0, 0)
      readline.clearScreenDown(process.stdout)
    }
    let distinctClear
    if (current) {
      const { ok } = await inquirer.prompt([
        {
          name: 'ok',
          type: 'confirm',
          message: `Generate project in current directory?`
        }
      ])
      if (!ok) return
      distinctClear = [
        {
          name: 'action',
          type: 'list',
          message: `The current directory ${chalk.cyan(
            targetDir
          )} must be empty. Pick an action:`,
          choices: [
            { name: 'Empty', value: 'empty' },
            { name: 'Cancel', value: false }
          ]
        }
      ]
    } else {
      distinctClear = [
        {
          name: 'action',
          type: 'list',
          message: `Target directory ${chalk.cyan(
            targetDir
          )} already exists. Pick an action:`,
          choices: [
            { name: 'Overwrite', value: 'overwrite' },
            { name: 'Cancel', value: false }
          ]
        }
      ]
    }
    const { action } = await inquirer.prompt(distinctClear)
    switch (action) {
      case 'overwirte':
        console.log(`\n Removing ${chalk.cyan(targetDir)}...`)
        await fs.remove(targetDir)
        break
      case 'empty':
        console.log(`\n Removing ${chalk.cyan(targetDir)}...`)
        await fs.emptyDir(targetDir)
        break
      default:
        return
    }
  }

  const { version } = await inquirer.prompt([
    {
      name: 'version',
      type: 'input',
      message: 'Version: ',
      default: '1.0.0'
    }
  ])

  const templateGitUrl = 'git@github.com:codeleafs/bridge.git'
  const command = `git clone ${templateGitUrl} ${distinct} && cd ${distinct}`

  console.log(chalk.white('\n Start generating...'))

  spinner.start()
  exec(command, (error, stdout, stderr) => {
    spinner.stop()
    if (error) {
      console.log(error)
      process.exit()
    }
    console.log(chalk.green('\n √ Generation completed!'))
    console.log(`\n cd ${name} && npm install \n`)
    process.exit()
  })
}

module.exports = (...args) => {
  init(...args).catch(err => {
    spinner.stop(false)
    console.log(chalk.red(err))
    process.exit(1)
  })
}

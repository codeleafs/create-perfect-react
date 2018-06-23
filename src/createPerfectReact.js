const chalk = require('chalk')
const exec = require('child_process').exec
const inquirer = require('inquirer')
const validateProjectName = require('validate-npm-package-name')
const ora = require('ora')
const fs = require('fs-extra')
const path = require('path')
const readline = require('readline')
const Metalsmith = require('metalsmith')
const render = require('consolidate').handlebars.render
const async = require('async')

async function create(distinct) {
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

  const root = path.resolve(distinct)
  if (fs.existsSync(root)) {
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
            root
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
            root
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
      case 'overwrite':
        console.log(`\n Removing ${chalk.cyan(root)}...`)
        await fs.remove(root)
        break
      case 'empty':
        console.log(`\n Removing ${chalk.cyan(root)}...`)
        await fs.emptyDir(root)
        break
      default:
        return
    }
  }

  console.log(`Creating a new perfect react project in ${chalk.green(root)}.`)
  console.log()

  const templateGitUrl = 'git@github.com:codeleafs/template-react.git'
  const command = `git clone ${templateGitUrl} .template-react`

  const spinnerDownload = ora(`Download template from ${templateGitUrl}`)
  spinnerDownload.start()
  exec(command, (error, stdout, stderr) => {
    spinnerDownload.stop()
    const spinner = ora('Start generating')
    spinner.start()
    const templatePath = path.resolve('.template-react')
    const metalsmith = Metalsmith(path.join(templatePath, 'template'))
    metalsmith
      .clean(false)
      .source('.')
      .ignore(['.git'])
      .use((files, metalsmith, done) => {
        const keys = Object.keys(files)
        const metalsmithMetadata = metalsmith.metadata()
        async.each(
          keys,
          (file, next) => {
            const str = files[file].contents.toString()
            if (!/{{([^{}]+)}}/g.test(str)) {
              return next()
            }
            render(str, metalsmithMetadata, (err, res) => {
              if (err) {
                return next(err)
              }
              files[file].contents = Buffer.from(res)
              next()
            })
          },
          done
        )
      })
      .destination(root)
      .build(err => {
        fs.removeSync(templatePath)
        if (!err) {
          console.log(chalk.green('\n √ Generation completed!'))
          console.log(`\n cd ${distinct} && npm install \n`)
        }
        spinner.stop()
        process.exit()
      })

    if (error) {
      spinnerDownload.stop()
      console.log(error)
      process.exit()
    }
  })
}

module.exports = (...args) => {
  create(...args).catch(err => {
    console.log(chalk.red(err))
    process.exit(1)
  })
}

const path = require('path')
const fs = require('fs')
const axios = require('axios')
const ora = require('ora')
const inquirer = require('inquirer')
const { downLoadDirectory } = require('./constant')
const { promisify } = require('util')
let downloadGitRepo = require('download-git-repo')
downloadGitRepo = promisify(downloadGitRepo)
let ncp = require('ncp')
ncp = promisify(ncp)
const metalsmith = require('metalsmith') // 遍历文件夹 找是否需要渲染
let { render } = require('consolidate').ejs
render = promisify(render)

async function getReposList() {
  const url = `https://api.github.com/orgs/cpcli/repos`
  const { data } = await axios.get(url)
  return data
}
async function getTagList(repo) {

  // /repos/{owner}/{repo}/tags
  // https://api.github.com/repos/cpcli/listpage_hooks/tags
  const url = `https://api.github.com/repos/cpcli/${repo}/tags`
  const { data } = await axios.get(url)
  return data
}

const Loading = (func, message) => async (...arg) => {
  const spinner = ora(message)
  spinner.start()

  const result = await func(...arg)

  // spinner.color = 'yellow';
  // spinner.text = 'Loading rainbows';
  spinner.succeed()

  return result
}

module.exports = async (projectName) => {
  // 
  console.log(projectName, 'projectName')
  // const spinner = ora('Loading...')
  // spinner.start()
  // let repos = await getReposList()
  // spinner.color = 'yellow';
  // spinner.text = 'Loading rainbows';
  // spinner.succeed()

  let repos = await Loading(getReposList, 'fetching template page...')()
  repos = repos.map(item => item.name)
  if (!repos.length) {
    console.log('no repos')
    return
  }
  const { repo } = await inquirer.prompt({
    name: 'repo',
    type: 'list',
    choices: repos,
    message: 'Please choise a page template'
  })
  let tags = await Loading(getTagList, 'fetching tags...')(repo)
  tags = tags.map(item => item.name)
  if (!tags.length) {
    console.log('no tags')
    return
  }
  const { tag } = await inquirer.prompt({
    name: 'tag',
    type: 'list',
    choices: tags,
    message: 'Please choise a tag'
  })
  console.log(repo, tag)
  // 处理模板
  // 将模板放到临时文件里备后期使用
  console.log(downLoadDirectory, '临时文件夹')
  const dest = Loading(DownloadTemplate, 'download template page...')(repo, tag)
  console.log(dest, 'dest')


  // 根据模板中是否有ask文件判断 模板是否需要渲染 metalsmith 遍历模板文件并编译
  // .template/xxx 如果有ask文件
  if (!fs.existsSync(path.join(dest, 'ask.js'))) {
    //  path.resolve() 代表当前执行命令的目录
    await ncp(dest, path.resolve(projectName))

  } else {
    await new Promise((resolve, reject) => {

      metalsmith(__dirname) // 如果传入路径 默认会遍历当前路径下的src文件夹
        .source(dest)
        .destination(path.resolve(projectName))
        .use(async (files, metal, done) => {
          const args = require(path.join(dest, 'ask.js'))
          let result = inquirer.prompt(args)
          console.log(result, '用户填写的结果')
          const meta = metal.metadata()
          Object.assign(meta, result)
          delete files['ask.js']
          done()
        })
        .use(async (files, metal, done) => {
          let obj = metal.metadata()
          Reflect.ownKeys(files).forEach(async (file) => {
            if (file.includes('js') || file.includes('json')) {
              let content = files[file].contents.toString() // 拿到文件内容
              if (content.includes('<%')) {
                content = await render(content, obj)
                files[file].contents = Buffer.from(content) // 渲染模板
              }
            }
          })
          done()
        })
        .build(e => {
          if (e) {
            reject(e)
          } else {
            resolve()
          }
        })
    })
  }
}

async function DownloadTemplate(repo, tag) {
  let api = `cpcli/${repo}`
  if (tag) {
    api += `#${tag}`
  }
  let dest = `${downLoadDirectory}/${repo}`
  await downloadGitRepo(api, dest)
  return dest
}


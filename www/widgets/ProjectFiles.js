/* global NNE, Widget, Convo, utils, FileUploader */
class ProjectFiles extends Widget {
  constructor (opts) {
    super(opts)
    this.key = 'project-files'
    this.keywords = ['assets', 'upload', 'github', 'files', 'project', 'finder']

    this.shaDict = {}

    this.title = 'Project Files'
    this._createHTML()
    this._setupFileUploader()

    Convo.load(this.key, () => { this.convos = window.CONVOS[this.key](this) })

    this.on('open', () => { window.convo = new Convo(this.convos, 'explain') })
  }

  _createHTML () {
    this.innerHTML = `
      <div class="files-widget">
        <!-- if logged out of GitHub -->
        <div class="files-widget__disclaimer">
          You're working on a sketch. In order to add assets (other files) you need to create a project first by authenticating your GitHub account and then clicking <code>newProject()</code> in the <b>Functions Menu</b>. (click on netnet's face to launch the <b>Functions Menu</b>)
        </div>
        <!-- if logged into GitHub -->
        <div class="files-widget__header">
          <button name="upload">Upload Asset</button>
        </div>
        <ul class="files-widget__list">
          <!-- upldateFiles populates this div -->
        </ul>
      </div>
    `

    this.$('[name="upload"]')
      .addEventListener('click', () => this.fu.input.click())

    this.updateFiles()
  }

  updateFiles (data) {
    // runs everytime a new repo (github project) is created or opened
    // as well as anytime a file is uploaded or deleted
    this._showHideDivs()
    this.$('.files-widget__list').innerHTML = ''
    if (!data) return

    const files = data
      .filter(f => f.name !== 'index.html')
      .filter(f => f.name !== 'README.md')
    files.forEach(file => {
      this.shaDict[file.name] = file.sha

      const ele = document.createElement('li')
      ele.className = 'files-widget__file'

      const name = document.createElement('span')
      name.className = 'files-widget__name'
      name.textContent = file.name

      const del = document.createElement('span')

      const trash = '<?xml version="1.0" encoding="utf-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><g transform="translate(0.000000,511.000000) scale(0.100000,-0.100000)"><path d="M4230.9,4975.2c-271.7-74.3-476.8-241-607.6-497.3c-69.2-138.4-71.8-153.8-79.5-625.5c-7.7-464-7.7-484.5,46.1-540.9c151.2-161.5,556.3-125.6,638.3,56.4c15.4,35.9,28.2,220.5,28.2,430.7c0,335.8,5.1,376.8,51.3,423c28.2,28.2,76.9,56.4,110.2,64.1c30.8,7.7,320.4,12.8,643.5,7.7l584.5-7.7l61.5-71.8c59-69.2,61.5-87.2,61.5-464c0-423,0-423,153.8-502.5c89.7-48.7,330.7-43.6,428.1,7.7c133.3,69.2,141,107.7,130.7,592.2c-7.7,428.1-10.3,440.9-87.1,605c-100,212.8-258.9,371.7-471.7,471.7l-166.6,79.5l-692.1,5.1C4510.4,5013.7,4343.7,5006,4230.9,4975.2z"/><path d="M2936.4,4616.3c-753.7-182-1286.9-435.8-1591.9-758.8c-269.2-284.5-343.5-499.9-343.5-994.6c0-474.3,74.3-710.1,294.8-945.9l110.2-117.9l182-1768.8c100-974.1,223-2171.3,271.7-2666.1c89.7-892.1,92.3-897.2,179.4-1079.2c258.9-530.7,956.2-874.2,2102.1-1040.8c358.9-51.3,1463.8-43.6,1832.9,15.4c1074.1,166.6,1748.3,512.7,1997,1020.3c92.3,184.6,61.5-61.5,505,4288.8l123.1,1204.8l105.1,128.2c248.7,299.9,294.8,448.6,294.8,961.3c0,487.1-43.6,640.9-253.8,917.7c-251.2,328.1-974.1,687-1709.8,846l-233.3,48.7l48.7-130.7c28.2-71.8,58.9-220.5,66.6-333.3l17.9-202.5l256.3-71.8c825.4-230.7,1274.1-594.7,1168.9-951.1c-43.6-146.1-269.2-364-502.4-487.1c-1322.8-687-4258-705-5639.7-30.8c-512.7,248.7-689.6,543.5-512.7,846c148.7,253.8,584.5,479.4,1335.6,689.6c15.4,5.1,35.9,87.2,43.6,184.6c7.7,97.4,38.4,246.1,66.7,330.7c28.2,82,48.7,151.2,46.2,153.8C3195.3,4675.3,3077.4,4649.6,2936.4,4616.3z M2741.5,1145.3c100-28.2,243.5-156.4,299.9-264c25.6-48.7,92.3-605,205.1-1691.9c89.7-892.1,182-1779.1,202.5-1971.4c20.5-192.3,38.5-415.3,38.5-492.2c0-123-7.7-146.1-79.5-205.1c-174.3-148.7-474.3-17.9-558.8,246.1C2821-3143.4,2408.3,748,2408.3,940.2c-2.6,92.3,10.3,125.6,66.7,171.8C2549.3,1176.1,2608.2,1183.8,2741.5,1145.3z M7548.1,1117.1c56.4-43.6,66.6-71.8,66.6-179.4c0-192.3-405-4047.8-438.3-4163.1c-56.4-202.5-289.7-356.3-471.7-310.2c-76.9,20.5-158.9,102.5-171.8,176.9c-20.5,112.8,407.6,4160.6,448.6,4237.5C7107.2,1117.1,7394.3,1240.2,7548.1,1117.1z M5187.1,783.8c30.8-15.4,76.9-53.8,100-84.6c41-48.7,46.2-205.1,46.2-2199.5v-2143.1l-64.1-79.5c-169.2-197.4-507.6-143.5-576.8,94.9c-20.5,64.1-25.6,751.1-20.5,2186.7c7.7,2053.4,7.7,2094.4,59,2150.8c28.2,30.8,74.3,66.7,102.5,79.5C4910.3,819.7,5123,817.2,5187.1,783.8z"/></g></svg>'
      const receptacle = document.createElement('span')
      receptacle.innerHTML = trash
      del.appendChild(receptacle)

      del.className = 'files-widget__del files-widget--pointer'
      del.addEventListener('click', () => this.deleteFile(file.name))

      ele.appendChild(name)
      ele.appendChild(del)
      this.$('.files-widget__list').appendChild(ele)
    })
  }

  uploadFile (file) {
    this._upload = file.name
    if (this.shaDict[file.name]) {
      this.convos = window.CONVOS[this.key](this)
      window.convo = new Convo(this.convos, 'duplicate-file')
    } else {
      utils.showCurtain('upload.html', {
        filename: file.name
      })

      const data = {
        owner: window.localStorage.getItem('owner'),
        repo: window.sessionStorage.getItem('opened-project'),
        name: file.name,
        code: file.data.split('base64,')[1]
      }
      utils.post('./api/github/upload-file', data, (res) => {
        if (!res.success) {
          console.log('FunctionsMenu:', res)
          window.convo = new Convo(this.convos, 'oh-no-error')
        } else {
          this._upload = null
          this._postUpdate()
        }
      })
    }
  }

  deleteFile (filename) {
    // runs when user clicks a files delete button
    this._delete = filename
    this.convos = window.CONVOS[this.key](this)
    window.convo = new Convo(this.convos, 'confirm-delete')
  }

  _postDeletion (file) {
    utils.showCurtain('delete.html')
    const data = {
      owner: window.localStorage.getItem('owner'),
      repo: window.sessionStorage.getItem('opened-project'),
      name: this._delete,
      sha: this.shaDict[this._delete]
    }
    utils.post('./api/github/delete-file', data, (res) => {
      if (!res.success) {
        console.log('FunctionsMenu:', res)
        window.convo = new Convo(this.convos, 'oh-no-error')
      } else {
        delete this.shaDict[this._delete]
        this._delete = null
        this._postUpdate()
      }
    })
  }

  _postUpdate () {
    const data = {
      owner: window.localStorage.getItem('owner'),
      repo: window.sessionStorage.getItem('opened-project')
    }
    utils.post('./api/github/open-project', data, (res) => {
      this.updateFiles(res.data)
      utils.hideCurtain('delete.html')
      utils.hideCurtain('upload.html')
      NNE.update()
    })
  }

  _showHideDivs () {
    const op = window.sessionStorage.getItem('opened-project')
    if (!op) {
      this.$('.files-widget__disclaimer').style.display = 'block'
      this.$('.files-widget__header').style.display = 'none'
      this.$('.files-widget__list').style.display = 'none'
    } else {
      this.$('.files-widget__disclaimer').style.display = 'none'
      this.$('.files-widget__header').style.display = 'block'
      this.$('.files-widget__list').style.display = 'block'
    }
  }

  _setupFileUploader () {
    this.fu = new FileUploader({
      maxSize: 5000, // 5 MB (see convos/project-files)
      ready: (file) => this.uploadFile(file),
      drop: '.files-widget',
      error: (err) => {
        console.error('ProjectFiles:', err)
        if (err.includes('file larger than max size')) {
          window.convo = new Convo(this.convos, 'file-too-big')
        }
      }
    })
  }
}

window.ProjectFiles = ProjectFiles

process.env.DEBUG = 'AutelisHost,HostBase'

// Autelis HTTP command reference:
// http://www.autelis.com/wiki/index.php?title=Pool_Control_(PI)_HTTP_Command_Reference

const
    debug       = require('debug')('AutelistHost'),
    Config      = require('./config'),
    credentials = Config.autelis.credentials,
    host        = Config.autelis.host,
    topic       = Config.mqtt.topic,
    deviceMap   = Config.deviceMap,
    request     = require('superagent'),
    xml2js      = require('xml2js').parseString,
    HostBase    = require('microservice-core/HostBase')

const POLL_TIME    = 6000,      // how often to poll Autelis controller
      REQUEST_TIME = 1500       // delay in requestProcessor

const runStates    = {
          1 : 'Not Connected',
          2 : 'Startup Initialization Sequence 2',
          3 : 'Startup Initialization Sequence 3',
          4 : 'Startup Initialization Sequence 4',
          5 : 'Startup Initialization Sequence 5',
          6 : 'Startup Initialization Sequence 6',
          7 : 'Startup Initialization Sequence 7',
          8 : 'Connected and Ready',
          9 : 'Connected and Busy Executing Command 9',
          10: 'Connected and Busy Executing Command 10',
          11: 'Connected and Busy Executing Command 11',
          12: 'Connected and Busy Executing Command 12'
      },
      opModes      = {
          0: 'Auto',
          1: 'Service',
          2: 'Timeout'
      },
      heaterStates = {
          0: 'off',
          1: 'enabled',
          2: 'on'
      }

class AutelisHost extends HostBase {
    constructor(host, topic) {
        debug('constructor', host, topic)
        super(host, topic)
        this.requestQueue = []
        this.poll()
        this.requestProcessor()
    }

    async pollOnce() {
        const url = `${host}/status.xml`
        return new Promise((resolve, reject) => {
            request
                .get(url)
                .auth(credentials.username, credentials.password)
                .end((err, res) => {
                    if (err) {
                        return reject(err)
                    }
                    xml2js(res.text, (err, result) => {
                        if (err) {
                            return reject(err)
                        }
                        const response  = result.response,
                              system    = response.system[0],
                              equipment = response.equipment[0],
                              temp      = response.temp[0]

                        // Flatten and convert data
                        //
                        // Every pool setup will have a different configuration, but the microservice
                        // is agnostic.  It does a straight conversion of the fields named in the
                        // http://poolcontrol/status.xml response which is consistent with the HTTP
                        // protocol linked above.
                        //
                        // Your client software will have to do conversions.  My system has aux1 is the
                        // spa jets, aux2 is the spa air blower, etc.  Your system may have different
                        // assignments.  Those can be configured in the client app.
                        const poolData = {
                            runstate : runStates[parseInt(system.runstate[0], 10)],
                            model    : '=' + system.model[0] + '=',
                            dip      : '=' + system.dip[0] + '=',
                            opmode   : opModes[parseInt(system.opmode[0], 10)],
                            vbat     : parseInt(system.vbat[0], 10) * 0.01464,
                            lowbat   : parseInt(system.lowbat[0], 10) ? 'Low' : 'Normal',
                            version  : system.version[0],
                            time     : parseInt(system.time[0], 10),
                            pump     : parseInt(equipment.pump[0], 10) ? 'on' : 'off',
                            pumplo   : parseInt(equipment.pumplo[0], 10) ? 'on' : 'off',
                            spa      : parseInt(equipment.spa[0], 10) ? 'on' : 'off',
                            waterfall: parseInt(equipment.waterfall[0], 10) ? 'on' : 'off',
                            cleaner  : parseInt(equipment.cleaner[0], 10) ? 'on' : 'off',
                            poolht   : heaterStates[parseInt(equipment.poolht[0], 10)],
                            spaht    : heaterStates[parseInt(equipment.spaht[0], 10)],
                            solarht  : heaterStates[parseInt(equipment.solarht[0], 10)],
                            aux1     : parseInt(equipment.aux1[0], 10) ? 'on' : 'off',
                            aux2     : parseInt(equipment.aux2[0], 10) ? 'on' : 'off',
                            aux3     : parseInt(equipment.aux3[0], 10) ? 'on' : 'off',
                            aux4     : parseInt(equipment.aux4[0], 10) ? 'on' : 'off',
                            aux5     : parseInt(equipment.aux5[0], 10) ? 'on' : 'off',
                            aux6     : parseInt(equipment.aux6[0], 10) ? 'on' : 'off',
                            aux7     : parseInt(equipment.aux7[0], 10) ? 'on' : 'off',
                            aux8     : parseInt(equipment.aux8[0], 10) ? 'on' : 'off',
                            aux9     : parseInt(equipment.aux9[0], 10) ? 'on' : 'off',
                            aux10    : parseInt(equipment.aux10[0], 10) ? 'on' : 'off',
                            aux11    : parseInt(equipment.aux11[0], 10) ? 'on' : 'off',
                            aux12    : parseInt(equipment.aux12[0], 10) ? 'on' : 'off',
                            aux13    : parseInt(equipment.aux13[0], 10) ? 'on' : 'off',
                            aux14    : parseInt(equipment.aux14[0], 10) ? 'on' : 'off',
                            aux15    : parseInt(equipment.aux15[0], 10) ? 'on' : 'off',
                            aux16    : parseInt(equipment.aux16[0], 10) ? 'on' : 'off',
                            aux17    : parseInt(equipment.aux17[0], 10) ? 'on' : 'off',
                            aux18    : parseInt(equipment.aux18[0], 10) ? 'on' : 'off',
                            aux19    : parseInt(equipment.aux19[0], 10) ? 'on' : 'off',
                            aux20    : parseInt(equipment.aux20[0], 10) ? 'on' : 'off',
                            aux21    : parseInt(equipment.aux21[0], 10) ? 'on' : 'off',
                            aux22    : parseInt(equipment.aux22[0], 10) ? 'on' : 'off',
                            aux23    : parseInt(equipment.aux23[0], 10) ? 'on' : 'off',
                            poolsp   : parseInt(temp.poolsp[0], 10),
                            poolsp2  : parseInt(temp.poolsp2[0], 10),
                            spasp    : parseInt(temp.spasp[0], 10),
                            pootTemp : parseInt(temp.pooltemp[0], 10),
                            spatemp  : parseInt(temp.spatemp[0], 10),
                            airtemp  : parseInt(temp.airtemp[0], 10),
                            solartemp: parseInt(temp.solartemp[0], 10),
                            tempunits: temp.tempunits,
                        }
                        resolve(poolData)
                    })
                })
        })
    }

    async processRequest(url) {
        if (!url) {
            return Promise.resolve()
        }
        return new Promise((resolve, reject) => {
            request
                .get(url)
                .auth(credentials.username, credentials.password)
                .end((err, response) => {
                    if (err) {
                        return reject(err)
                    }
                    resolve(response.text)
                })
        })
    }

    async requestProcessor() {
        while (1) {
            this.processRequest(this.requestQueue.shift())
            await this.wait(REQUEST_TIME)
        }
    }

    async poll() {
        while (1) {
            try {
                this.state = await this.pollOnce()
            }
            catch (e) {
                console.log('ERROR', e.message)
            }
            await this.wait(POLL_TIME)
        }

    }

    command(device, state) {
        const dev = deviceMap.forward[device]

        if (device === 'spasp' || device === 'poolsp') {
            state = Number(state)
        }

        if (dev === undefined || this.state[device] === state) {
            console.log(device, dev, state, 'ignored')
            return
        }

        let newState   = state,
            isSetpoint = false

        console.log('dev', dev, 'device', device, '')
        if (state === 'on') {
            newState = '&value=1'
        }
        else if (state === 'off') {
            newState = '&value=0'
        }
        else {
            newState   = `&temp=${newState}`
            isSetpoint = true
        }

        const url = `${host}/set.cgi?name=${dev}${newState}`
        debug(url)

        if (isSetpoint) {
            this.requestQueue.push(url)
            return Promise.resolve()
        }
        return new Promise((resolve, reject) => {
            request
                .get(url)
                .auth(credentials.username, credentials.password)
                .end((err, response) => {
                    if (err) {
                        return reject(err)
                    }
                    else {
                        return resolve()
                    }
                })
        })
    }
}

const self = new AutelisHost(Config.mqtt.host, Config.mqtt.topic)


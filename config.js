/**
 *
 */

module.exports = {
    // set this to wherever your mqtt server is
    mqtt     : {
        // host where mqtt server resides
        // you can add an entry to this server's /etc/hosts to point
        // the name 'ha' at the mqtt server, or edit this line, or
        // set up your DNS proper
        host : 'mqtt://ha',
        // This is the base of the topic used to publish/subscribe.
        // For example, autelis/# (on the client) to listen to all updates
        // or autelis/jets to listen for events about the Spa jets.
        // Client can turn on the jets with
        //      topic: autelist/jets
        //      message: on
        //
        topic: 'autelis',
    },
    // base URL to your pool control
    // by default, the autelis controller uses mDNS to configure its hostname to poolcontrol.
    autelis  : {
        host       : 'http://poolcontrol',
        // we keep assorted credentials files in a directory pointed to by ENV variable CREDENTIALS
        // the credntials file is something like:
        // ```
        // module.exports = { username: 'some_user', password: 'some_password'}
        // ```
        // this allows us to keep our credentials OUTSIDE the git repos
        credentials: require(`${process.env.CREDENTIALS}/Autelis`),
    },
    // this is the mapping of autelis device names to useful names
    // for example, the autelis controller might use aux1 to control the jets
    // and we want to say "jets" everywhere
    deviceMap: {
        forward : {
            pump        : 'pump',
            spa         : 'spa',
            jets        : 'aux1',
            blower      : 'aux2',
            cleaner     : 'aux3',
            waterfall   : 'aux4',
            poolLight   : 'aux5',
            spaLight    : 'aux6',
            spaSetpoint : 'spasp',
            poolSetpoint: 'poolsp',
            spaHeat     : 'spaht',
            poolHeat    : 'poolht',
        },
        backward: {
            pump  : 'pump',
            spa   : 'spa',
            aux1  : 'jet',
            aux2  : 'blower',
            aux3  : 'cleaner',
            aux4  : 'waterfall',
            aux5  : 'poolLight',
            aux6  : 'spaLight',
            spasp : 'spaSetpoint',
            poolsp: 'poolSetpoint',
        }
    }

}
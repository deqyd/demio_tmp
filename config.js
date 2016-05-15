/* jshint -W101 */
const DEFAULT_ROOM = 'demioexample';


var CONF_OPTIONS = {
    openSctp: true
}

var SERVER = "";

// 78.46.59.71
// ec2-52-51-12-4.eu-west-1.compute.amazonaws.com
var CONFIG = {};

function initConfig() {
    CONFIG = {
    //    configLocation: './config.json', // see ./modules/HttpConfigFetch.js
        hosts: {
            domain: SERVER,
            //anonymousdomain: 'guest.example.com',
            //authdomain: 'SERVER',  // defaults to <domain>
            muc: 'conference.'+SERVER, // FIXME: use XEP-0030
            bridge: 'jitsi-videobridge.'+SERVER, // FIXME: use XEP-0030
            //jirecon: 'jirecon.'+SERVER,
            //call_control: 'callcontrol.'+SERVER,
            //focus: 'focus.'+SERVER, // defaults to 'focus.SERVER'
        },
    //  getroomnode: function (path) { return 'someprefixpossiblybasedonpath'; },
    //  useStunTurn: true, // use XEP-0215 to fetch STUN and TURN SERVER
    //  useIPv6: true, // ipv6 support. use at your own risk
        useNicks: false,
        bosh: 'https://'+SERVER+'/http-bind', // FIXME: use xep-0156 for that
        clientNode: 'http://jitsi.org/jitsimeet', // The name of client node advertised in XEP-0115 'c' stanza
        focusUserJid: 'focus@auth.'+SERVER, // The real JID of focus participant - can be overridden here
        //defaultSipNumber: '', // Default SIP number

        // Desktop sharing method. Can be set to 'ext', 'webrtc' or false to disable.
        desktopSharingChromeMethod: 'webrtc',
        // The ID of the jidesha extension for Chrome.
        desktopSharingChromeExtId: 'diibjkoicjeejcmhdnailmkgecihlobk',
        // The media sources to use when using screen sharing with the Chrome
        // extension.
        desktopSharingChromeSources: ['screen', 'window'],
        // Required version of Chrome extension
        desktopSharingChromeMinExtVersion: '0.1',

        // The ID of the jidesha extension for Firefox. If null, we assume that no
        // extension is required.
        desktopSharingFirefoxExtId: null,
        // Whether desktop sharing should be disabled on Firefox.
        desktopSharingFirefoxDisabled: true,
        // The maximum version of Firefox which requires a jidesha extension.
        // Example: if set to 41, we will require the extension for Firefox versions
        // up to and including 41. On Firefox 42 and higher, we will run without the
        // extension.
        // If set to -1, an extension will be required for all versions of Firefox.
        desktopSharingFirefoxMaxVersionExtRequired: -1,
        // The URL to the Firefox extension for desktop sharing.
        desktopSharingFirefoxExtensionURL: null,

        // Disables ICE/UDP by filtering out local and remote UDP candidates in signalling.
        webrtcIceUdpDisable: false,
        // Disables ICE/TCP by filtering out local and remote TCP candidates in signalling.
        webrtcIceTcpDisable: false,

        openSctp: true, // Toggle to enable/disable SCTP channels
        disableStats: false,
        disableAudioLevels: false,
        channelLastN: -1, // The default value of the channel attribute last-n.
        adaptiveLastN: false,
        //disableAdaptiveSimulcast: false,
        enableRecording: false,
        enableWelcomePage: true,
        disableSimulcast: false,
        logStats: false, // Enable logging of PeerConnection stats via the focus
    //    requireDisplayName: true, // Forces the participants that doesn't have display name to enter it when they enter the room.
    //    startAudioMuted: 10, // every participant after the Nth will start audio muted
        startVideoMuted: 0, // every participant after the Nth will start video muted
    //    defaultLanguage: "en",
    // To enable sending statistics to callstats.io you should provide Applicaiton ID and Secret.
    //    callStatsID: "", // Application ID for callstats.io API
    //    callStatsSecret: "", // Secret for callstats.io API
        /*noticeMessage: 'Service update is scheduled for 16th March 2015. ' +
        'During that time service will not be available. ' +
        'Apologise for inconvenience.',*/
        disableThirdPartyRequests: false,
        minHDHeight: 540
    };
}

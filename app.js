var config = require('./config.js');

//=======================> CHANGE ONLY THE BELOW ACCORDINGLY <=======================\\
var INIT = true; //set to false if you wish to let the filesystem detect coordinator or moderator
var USER_ROLE = config.userRoles.presenter; //presenter || coordinator
var MIC_ON = true; //everyone
var WEBCAM_ON = USER_ROLE == config.userRoles.presenter ? true : false;
var DESKTOP_SHARING = USER_ROLE == config.userRoles.presenter ? true : false;
//=======================> CHANGE ONLY THE ABOVE ACCORDINGLY <=======================\\

window.DEMIOJITSI = (function () {

  var remoteTracks       = [];
  var localTracks        = [];
  var remoteCamRooms     = [];
  var remoteCamPIDs      = [];

  var CONFIG             = config.jitsi;
  var SERVER             = config.webRTC.SERVER;
  var USER               = {};
  var WEBINAR_ROOM       = "DEMIO";
  var WEBCAMSCON         = 'body';
  var AUDIOSCON          = 'body';
  var STREAMSCON         = 'body';
  var POSTCALL           = null;

  //DEMIO JITSI METHODS
  var METHODS = {

    init: function (data) {
      //set webinar room
      USER          = data.user;
      WEBINAR_ROOM  = data.webinarState.webinarRoom;
      WEBCAMSCON    = data.webcamsContainer;
      STREAMSCON    = data.screensContainer;
      AUDIOSCON     = data.audiosContainer;
      POSTCALL      = data.postCall;

      JitsiMeetJS.init(CONFIG);
      //start(); use this to determine who is CONNECTED
      JITSI.connect();
    },

    closeConnections: function () {

      for (key in localTracks) {
        if (localTracks[key]) {
          TRACKS.closeStream(localTracks[key]);
        }
      }

      if (ROOM.conference)   ROOM.conference.leave();
      if (ROOM.screenshare)  ROOM.screenshare.leave();
      if (JITSI.connection)  JITSI.connection.disconnect();
      if (JITSI.ssconnection)  JITSI.ssconnection.disconnect();
    },

    muteMic: function(muted) {
      if(localTracks['audio'] && localTracks['audio'].stream)
        localTracks['audio'].stream[muted ? 'mute' : 'unmute']();
    },

    muteCam: function(muted) {
      if(localTracks['camera'] && localTracks['camera'].stream) {
        localTracks['camera'].stream[muted ? 'mute' : 'unmute']();
        //$(localTracks['camera'].element).closest('.media-con')[muted ? 'hide' : 'show']();
      }
    },

    streamMic: function (activate) {

      if (ROOM.inConference) {
        if(activate) {//create track only if activated to do so
          if(!localTracks['audio']) {
            // activate streaming
            console.log('----> JITSI: MIC STREAM NOT CREATED, CREATING......');
            JitsiMeetJS.createLocalTracks({devices: ["audio"]})
              .then(TRACKS.onLocalTracks('conference'))
              .then(function() {
                METHODS.muteMic(!activate);
              });
          }
        }
        console.log('----> JITSI: ' + (activate ? 'UNMUTING' : 'MUTING') + ' MIC');
        METHODS.muteMic(!activate);
      }

    },

    streamWebcam: function (activate) {
      if (ROOM.inConference) {
        if(activate) {//create track only if activated to do so
          if(!localTracks['camera']) {
            console.log('----> JITSI: CAM STREAM NOT CREATED, CREATING......');
            JitsiMeetJS.createLocalTracks({devices: ["video"]})
              .then(TRACKS.onLocalTracks('conference'));
          }
        } else {
          if(localTracks['camera']) {
            //already created lets destroy
            console.log('----> JITSI: DESTROYING WEBCAM STREAM');
            TRACKS.closeStream(localTracks['camera']);
            delete localTracks['camera'];
          }
        }
      }
      if(typeof POSTCALL == 'function') POSTCALL();
    },

    streamScreenShare: function (activate) {
      if (ROOM.inSSharening) {

        if(activate) {//create track only if activated to do so
          if(!localTracks['screen']) {
            // activate streaming
            console.log('----> JITSI: SCREENSHARE STREAM NOT CREATED, CREATING......');
            JitsiMeetJS.createLocalTracks({devices: ["desktop"]})
              .then(TRACKS.onLocalTracks('screenshare'));
          }
        } else {
          //already created lets destroy
          console.log('----> JITSI: DESTROYING SCREENSHARE STREAM');
          TRACKS.closeStream(localTracks['screen']);
          delete localTracks['screen'];
        }

      }
      if(typeof POSTCALL == 'function') POSTCALL();
    },
  };

  //for JITSI connections
  var JITSI = {
    room:         null,
    connection:   null,
    ssconnection: null,
    init:         false,

    connect: function () {
      //add listeners
      JITSI.connection = new JitsiMeetJS.JitsiConnection(null, null, CONFIG);
      JITSI.connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, JITSI.onConnectionSuccess('conference'));
      JITSI.connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, JITSI.onConnectionFailed);
      JITSI.connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, JITSI.onDisconnected);
      JITSI.connection.connect();

      JITSI.ssconnection = new JitsiMeetJS.JitsiConnection(null, null, CONFIG);
      JITSI.ssconnection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, JITSI.onConnectionSuccess('screenshare'));
      JITSI.ssconnection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, JITSI.onConnectionFailed);
      JITSI.ssconnection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, JITSI.onDisconnected);
      JITSI.ssconnection.connect();
    },

    onDisconnected: function () {
      console.log("----> JITSI: DISCONNECTED!");
      //remove listeners
      JITSI.inited = false;
      JITSI.connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, JITSI.onConnectionSuccess('conference'));
      JITSI.connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, JITSI.onConnectionFailed);
      JITSI.connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, JITSI.onDisconnected);
      
      JITSI.ssconnection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, JITSI.onConnectionSuccess('screenshare'));
      JITSI.ssconnection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, JITSI.onConnectionFailed);
      JITSI.ssconnection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, JITSI.onDisconnected);
    },

    onConnectionFailed: function () {
      JITSI.inited = false;
      console.log('----> JITSI: CONNECTION TO SERVER FAILED');
      alert('CONNECTION TO SERVER FAILED');
    },

    onConnectionSuccess: function (type) {
      return function() {
        console.log('----> JITSI: CONNECTED TO SERVER SUCCESSFULLY');

        //close connections after windows are closed
        $(window).on('beforeunload unload', DEMIOJITSI.closeConnections);

        //configure room
        CONFIG.bosh += '?room=' + WEBINAR_ROOM + (type == 'screenshare' ? '_scrnshr' : '');
        JITSI.inited = true;
      
        //set whats possible
        switch(USER.role) {

         case config.userRoles.presenter:
         case config.userRoles.host:
           ROOM.permissions = { voice: true, sshare: true, webcam: true };
         break;

         case config.userRoles.coordinator:
           ROOM.permissions = { voice: true, sshare: false, webcam: true };
         break;

         case config.userRoles.attendee:
           ROOM.permissions = { voice: true, sshare: false, webcam: true };
         break;

        }
      
        JITSI.joinRooms(type);//TODO maybe we can join rooms only when we have an active stream or have been given permissions
      }
    },

    joinRooms: function (type) {

      switch(type) {
        
        case 'conference':
          //all webcam and voices
          ROOM.conference = JITSI.connection.initJitsiConference(WEBINAR_ROOM, CONFIG.CONF_OPTIONS);
          ROOM.conference.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, ROOM.onRoomJoined('conference'));
          ROOM.conference.on(JitsiMeetJS.events.conference.TRACK_ADDED, TRACKS.onRemoteTrackAdded('conference'));
          ROOM.conference.on(JitsiMeetJS.events.conference.TRACK_REMOVED, TRACKS.onTrackRemoteRemoved('conference'));
          // ROOM.conference.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, TRACKS.onRemoteTrackMuteChange('conference'));
          ROOM.conference.on(JitsiMeetJS.events.conference.USER_LEFT, ROOM.onUserLeftRoom);
          ROOM.conference.join();
          break;
          
        case 'screenshare':
          //screen sharing
          ROOM.screenshare = JITSI.ssconnection.initJitsiConference(WEBINAR_ROOM + '_scrnshr', CONFIG.CONF_OPTIONS);
          ROOM.screenshare.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, ROOM.onRoomJoined('screenshare'));
          ROOM.screenshare.on(JitsiMeetJS.events.conference.TRACK_ADDED, TRACKS.onRemoteTrackAdded('screenshare'));
          ROOM.screenshare.on(JitsiMeetJS.events.conference.TRACK_REMOVED, TRACKS.onTrackRemoteRemoved('screenshare'));
          //ROOM.screenshare.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, TRACKS.onRemoteTrackMuteChange('screenshare'));
          ROOM.screenshare.on(JitsiMeetJS.events.conference.USER_LEFT, ROOM.onUserLeftRoom);
          ROOM.screenshare.join();
          break;
          
      }

    }

  }

  var ROOM = {
    conference:   null,
    screenshare:  null,
    inConference: false,
    inSSharening: false,
    confID:       null,
    screenID:     null,

    permissions: {
      voice:  false,
      sshare: false,
      webcam: false,
    },

    buildDisplayName: function (usr) {
      if (!usr) var usr = USER;
      return (usr.role || 'user').substr(0,4) + "_" + (usr.userID || Math.floor(Math.random() * 999)); // pres / coor / host / atte
    },

    onRoomJoined: function (type) {
      return function () {
        // I have joined the room
        console.log('----> JITSI: '+type+' ROOM JOINED ');
        switch(type) {
          case 'conference':
            ROOM.confID = ROOM.conference.myUserId();
            ROOM.inConference = true;
            //create the respective up streams if permissions exists
            METHODS.streamMic(ROOM.permissions.voice && USER.micEnabled ? true : false);
            //create the respective up streams if permissions exists
            METHODS.streamWebcam(ROOM.permissions.webcam && USER.camEnabled ? true : false);
          break;
          case 'screenshare':
            ROOM.screenID = ROOM.screenshare.myUserId();
            ROOM.inSSharening = true;
            //create the respective up streams if permissions exists
            METHODS.streamScreenShare(ROOM.permissions.sshare && USER.isStreaming ? true : false);
          break;

        }
      }
    },

    onUserLeftRoom: function (id) {
        console.log("----> JITSI: USER LEFT", id);
        if (!remoteTracks[id]) return;//we cannot find it
        console.log("----> JITSI: CLEANING UP USER'S TRACKS: ", remoteTracks[id]);
        for (key in remoteTracks[id]) {
          if (remoteTracks[id][key]) {
            TRACKS.closeStream(remoteTracks[id][key], true);
            delete remoteTracks[id][key];
          }
        }
        delete remoteTracks[id];
    },

  }

  var TRACKS = {
    onLocalTracks: function (type) {
      return function (tracks) {
        var track = tracks[0];
        console.log('----> JITSI: onLocalTracks ', track);

        switch(type) {

          case 'conference':
            if(track.getType() == 'audio') {
              console.log("----> JITSI: SHARING MY MIC AUDIO: " + track.getType());
              // its an audio feed
              // add audio stream feed to viewer
              var trackEl = TRACKS.buildAudEl({ parCon: AUDIOSCON, conClass: 'audio mine', id: USER.userID, elID: 'audio_stream', muted: true });
              localTracks['audio'] = { stream: track, element: trackEl };
              localTracks['audio'].stream.attach(localTracks['audio'].element);
              ROOM.conference.addTrack(localTracks['audio'].stream);

            } else {
              console.log("----> JITSI: SHARING MY WEBCAM VIDEO: " + track.getType());

              // if it is a webcam video track
              // add webcam feed to viewer
              var trackEl = TRACKS.buildVidEl({ parCon: WEBCAMSCON, conClass: 'webcam mine', id: USER.userID, elID: 'webcam_stream' });
              localTracks['camera'] = { stream: track, element: trackEl };
              localTracks['camera'].stream.attach(localTracks['camera'].element);
              ROOM.conference.addTrack(localTracks['camera'].stream);
            }
          break;
          case 'screenshare':
            console.log("----> JITSI: SHARING MY SCREEN VIDEO: " + track.getType());
            // it is a screen share video track
            // add screen share feed to viewer
            var trackEl = TRACKS.buildVidEl({ parCon: STREAMSCON, conClass: 'stream-con mine', id: USER.userID, elID: 'screenshare_stream'});
            localTracks['screen'] = { stream: track, element: trackEl };
            localTracks['screen'].stream.attach(localTracks['screen'].element);
            ROOM.screenshare.addTrack(localTracks['screen'].stream);
          break;

        }

        if(typeof POSTCALL == 'function') POSTCALL();

      }
      //end of func

    },
    onRemoteTrackAdded: function(type) {
      return function (track) {
        
        // if it's local then - out
        if (track.isLocal() || !track.stream) return;

        var UID = this.uid;
        console.log("----> JITSI: REMOTE "+type+" TRACK ADDED: ", track);
        // Remote track received

        var pID = track.getParticipantId();

        if (!remoteTracks[pID]) remoteTracks[pID] = [];

        if (!pID) return;

        switch(type) {

          case 'conference':
            if(track.getType() == 'audio') {
              //its an audio or webcam feed / stream
              // its an audio feed
              // else it is an audio track
              // add audio stream feed to viewer
              var trackEl = TRACKS.buildAudEl({ parCon: AUDIOSCON, conClass: 'audio remote', id: pID, elID: pID+'_audio' });
              remoteTracks[pID]['audio'] = { stream: track, element: trackEl };
              remoteTracks[pID]['audio'].stream.attach(remoteTracks[pID]['audio'].element);
            } else {
              // it is a webcam video track
              // add webcam feed to viewer dom
              var trackEl = TRACKS.buildVidEl({ parCon: WEBCAMSCON, conClass: 'webcam remote', id: pID, elID: pID+'_camera' });
              remoteTracks[pID]['camera'] = { stream: track, element: trackEl };
              remoteTracks[pID]['camera'].stream.attach(remoteTracks[pID]['camera'].element);
              if(UID) remoteCamPIDs[UID] = pID;
            }

          break;

          case 'screenshare':
            // it is a screen share video track
            // add screen share feed to viewer
            var trackEl = TRACKS.buildVidEl({ parCon: STREAMSCON, conClass: 'stream-con remote', id: USER.userID, elID: 'screenshare_stream'});

            remoteTracks[pID]['screen'] = { stream: track, element: trackEl };
            remoteTracks[pID]['screen'].stream.attach(remoteTracks[pID]['screen'].element);
          break;

        }

        if(typeof POSTCALL == 'function') POSTCALL();

      }
      //end of func

    },
    onRemoteTrackMuteChange: function(type) {
      return function (track) {
        
        // if it's local then - out
        if(track.isLocal()) return; // DO NOT TERMINATE YOUR OWN

        console.log('----> JITSI: onRemoteTrackMuteChange IN '+(type), track);

        switch(type) {

          case 'conference':
            var pID = track.getParticipantId();
            console.log('----> JITSI: found pID ', pID);
            console.log('----> JITSI: Looking for remoteTracks ');
            if (remoteTracks[pID]) {
              //lets hide or show feed
              console.log('----> JITSI: found remoteTracks ', remoteTracks[pID]);
              //console.log('----> JITSI: Looking for remoteTrack camera and elements', remoteTracks[pID]['camera'].element, $(remoteTracks[pID]['camera'].element).closest('.media-con'));
              $(remoteTracks[pID]['camera'].element).closest('.media-con')[track.isMuted() ? 'hide' : 'show']();
            }
          break;

          case 'screenshare':
            //not used yes, this will be the pausing feature
          break;

        }

        if(typeof POSTCALL == 'function') POSTCALL();

      }
      //end of func

    },
    onTrackRemoteRemoved: function(type) {
      return function (track) {

        if(track.isLocal()) return; // DO NOT TERMINATE YOUR OWN

        console.log('----> JITSI: onTrackRemoteRemoved ', track);

        switch(type) {

          case 'conference':
            if(track.getType() == 'audio') {
              console.log("----> JITSI: TERMINATING REMOTE AUDIO");
              // lets terminate mic audio track
              var pID = track.getParticipantId();
              if (remoteTracks[pID]) {
                TRACKS.closeStream(remoteTracks[pID]['audio']);
                delete remoteTracks[pID];
              }
            } else {
              console.log("----> JITSI: TERMINATING REMOTE WEBCAM");
              // lets terminate webcam video track
              var pID = track.getParticipantId();
              if (remoteTracks[pID]) {
                TRACKS.closeStream(remoteTracks[pID]['camera']);
                delete remoteTracks[pID];
              }
            }

          break;

          case 'screenshare':
            console.log("----> JITSI: TERMINATING SCREENSHARE");
            // lets terminate screen share video track
            console.log("----> JITSI: ITS REMOTE");
            var pID = track.getParticipantId();
            if (remoteTracks[pID]) {
              TRACKS.closeStream(remoteTracks[pID]['screen']);
              delete remoteTracks[pID];
            }
          break;

        }

        if(typeof POSTCALL == 'function') POSTCALL();

      }
      //end of func

    },

    buildVidEl: function (params) {
      var prev = document.getElementById(params.elID);
      if (prev) return prev;
      var vid = '<video autoplay="1" id="' + params.elID + '" />';
      $(params.parCon).append('<div class="media-con '+params.conClass+'" data-id="'+params.id+'">'+vid+'</div>');
      return $('#'+params.elID)[0];
    },

    buildAudEl: function (params) {
      var prev = document.getElementById(params.elID);
      if (prev) return prev;
      var aud = '<audio autoplay="1" id="' + params.elID + '" '+(params.muted ? ' muted="true"' : '')+' />';
      $(params.parCon).append('<div class="media-con '+params.conClass+'" data-id="'+params.id+'">'+aud+'</div>');
      return $('#'+params.elID)[0];
    },

    closeStream: function (src,discardElement) {
      console.log('----> JITSI: closeStream ', src);
      if (src) {
        if(src.stream) {
          src.stream.detach(src.element);
          if (typeof src.stream.dispose === 'function') try { src.stream.dispose(); } catch(e) { console.log('----> JITSI: error disposing stream: ', e); }
        }
        if (/*discardElement && */src.element) $(src.element).closest('.media-con').remove();
      }
      if(typeof POSTCALL == 'function') POSTCALL();
    }
  }

  return METHODS;
})();

var initapp = function() {
  
  var waitingScreenCalc = function() { $('#wait-screen')[($('#stream > div:visible').length + $('#webcams > div:visible').length) ? 'hide' : 'show'](); }
  var user = {
    userID: Math.floor(Math.random() * 88888888),
    role: USER_ROLE,
    micEnabled: MIC_ON,
    camEnabled: WEBCAM_ON,
    isStreaming: DESKTOP_SHARING,
  }
  
  DEMIOJITSI.init({
    user: user,
    webinarState: {
      webinarRoom: 'demio_stress_test'
    },
    webcamsContainer: '#webcams',
    screensContainer: '#stream',
    audiosContainer:  '#audios',
    postCall: waitingScreenCalc
  });
}

if(INIT && USER_ROLE) initapp();
else {
  // let filesystem decide
  var remote = require('electron').remote;
  var appPath = remote.app.getPath('home');
  var path = require('path');
  var fs = require('fs');

  var p = path.join(appPath + '/.presenter');
  fs.exists(p, function(isPresenter) {
    USER_ROLE = config.userRoles[isPresenter ? 'presenter' : 'coordinator'];
    MIC_ON = true;//everyone
    WEBCAM_ON = isPresenter ? true : false;
    DESKTOP_SHARING = isPresenter ? true : false;
    
    //now start
    initapp();
  });
}

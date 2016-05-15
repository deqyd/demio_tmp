var conection = null;
var room = null;
var webcamRoom = null;
var isJoined = false;
var remoteTracks = {};
var webCamRemoteTrack = null;
var localTracks = [];
var isPresenter = false;
var coordinatorStatus = false;
var presenterId = "";
var isJoinedToWebcam = false;

var remote = require('electron').remote;
var appPath = remote.app.getPath('home');

function isCoordinator() {
  var path = require('path');
  var p = path.join(appPath + '/.coordinator');
  var fs = require('fs');
  fs.exists(p, function(exists) {
    if (exists) {
      coordinatorStatus = true
    }
    connect();
  });
}

function start() {
  // Check user status
  var path = require('path');
  var p = path.join(appPath + '/.presenter');
  var fs = require('fs');
  fs.exists(p, function(exists) {
    if (exists) {
      isPresenter = true
    } else {
      $("#wait-screen")[0].style.display = "block";
    }
    isCoordinator();
  });
}

function connect() {
  connection = new JitsiMeetJS.JitsiConnection(null, null, CONFIG);
  connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, onConnectionSuccess);
  connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, onConnectionFailed);
  connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, disconnect);
  connection.connect();
}

function disconnect(){
  console.log("disconnect!");
  connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, onConnectionSuccess);
  connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, onConnectionFailed);
  connection.removeEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, disconnect);
}

//Callbacks
function onUserLeft(id) {
    console.log("user left");
    if(!remoteTracks[id])
        return;
    var tracks = remoteTracks[id];
    for(var i = 0; i< tracks.length; i++) {
      tracks[i].detach($("#" + id + tracks[i].getType() + (i+1))[0]);
      $("#" + id + tracks[i].getType() + (i+1))[0].remove();
    }
    // if presenter - out, then mute all audio containers between coordinators
    if (id == presenterId) {
        webCamRemoteTrack.detach($("#localVideoCamera")[0]);
        $("#localVideoCamera")[0].remove();
        var coordAudios = [];
        coordAudios = $(".coordinator");
        for (coordEl in coordAudios) {
          coordAudios[coordEl].muted = true;
        }
        $("#wait-screen")[0].style.display = "block";
    }
}

function onConnectionSuccess() {
  console.log('CONNECTED TO SERVER SUCCESSFULY');
  CONFIG.bosh += '?room=' + DEFAULT_ROOM;
  room = connection.initJitsiConference(DEFAULT_ROOM, CONF_OPTIONS);
  room.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, onConferenceJoined);
  room.on(JitsiMeetJS.events.conference.TRACK_ADDED, onRemoteTrack);
  room.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);
  room.join();
}

function startWebCam() {
  isJoinedToWebcam = true;
  webcamRoom = connection.initJitsiConference(DEFAULT_ROOM+"webcam", CONF_OPTIONS);
  webcamRoom.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, onWebCamConferenceJoined);
  webcamRoom.on(JitsiMeetJS.events.conference.TRACK_ADDED, onWebCamRemoteTrack);
  webcamRoom.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);
  webcamRoom.join();
}

function onRemoteTrack(track) {
  // Remote track received
  // if it's local then - out
  console.log("REMOTE TRACK ADDED: " + track);
  if(track.isLocal() || !track.stream)
      return;
  var participant = track.getParticipantId();
  if(!remoteTracks[participant])
      remoteTracks[participant] = [];
  var idx = remoteTracks[participant].push(track);
  var id = participant + track.getType() + idx;
  // if it's video, then add a video container to stage
  if(track.getType() == "video") {
      presenterId = room.getParticipantById(participant)._id;
      $("#wait-screen")[0].style.display = "none";
      $("body").append("<video autoplay='1' id='" + participant + "video" + idx + "' />");
      if (presenterId !== room.myUserId() && !isJoinedToWebcam) {
        startWebCam();
      }
  } else {
      // else it's audio then add audio container to stage
      if (room.getParticipantById(participant)._displayName == "coordinator") {
        // if it's from coordinator then and presenter not online then add muted audio else not muted
        if (presenterId !== "") {
          $("body").append("<audio autoplay='1' id='" + participant + "audio" + idx + "' class='coordinator'/>");
        } else {
          $("body").append("<audio autoplay='1' id='" + participant + "audio" + idx + "' class='coordinator' muted='true'/>");
        }
      }
      else {
        $("body").append("<audio autoplay='1' id='" + participant + "audio" + idx + "' />");
      }
  }
  // if presenter online - unmute all audio containers
  if (presenterId !== "") {
    var coordAudios = [];
    coordAudios = $(".coordinator");
    for (coordEl in coordAudios) {
      coordAudios[coordEl].muted = false;
    }
  }
  track.attach($("#" + id)[0]);
}

function onConnectionFailed() {
  console.log('CONNECTION TO SERVER FAILED');
}

function checkPresenterPrescence() {
  var participants = room.getParticipants();
  for (var key in participants) {
    if (participants[parseInt(key)]._displayName)
      if (participants[parseInt(key)]._displayName == "presenter") {
        presenterId = participants[parseInt(key)]._id;
        return true
      }
  }
  return false
}

function onConferenceJoined() {
  console.log('CONFERENCE JOINED');
  isJoined = true;
  var started = false;
  if (isPresenter && !checkPresenterPrescence()) {
    started = true;
    room.setDisplayName("presenter");
    presenterId = room.myUserId();
    JitsiMeetJS.createLocalTracks({devices: ["desktop", "audio"]})
    .then(onLocalTracks)
    .then(function() {
      // Here we are ready to share a web cam for presenter
      startWebCam();
    });
  }
  if (coordinatorStatus && !started) {
      room.setDisplayName("coordinator");
      JitsiMeetJS.createLocalTracks({devices: ["audio"]}).then(onLocalTracks);
  }
}


function onWebCamConferenceJoined() {
  console.log('WEBCAM CONFERENCE JOINED');
  if (presenterId == room.myUserId())
    JitsiMeetJS.createLocalTracks({devices: ["video"]}).then(onLocalTracks);
}

function onWebCamRemoteTrack(track) {
  console.log("REMOTE TRACK RECEIVED: "+track+" "+track.getType());
  if (track.isLocal() || !track.stream)
    return
  webCamRemoteTrack = track;
  $("body").append("<video autoplay='1' id='localVideoCamera' />");
  $("#localVideoCamera").draggable();
  track.attach($("#localVideoCamera")[0]);
}

function onLocalTracks(tracks) {
  localTracks = tracks;
  for(var i = 0; i < localTracks.length; i++)
  {
      if(localTracks[i].getType() == "video") {
          if (localTracks[i].videoType == "camera") {
            $("body").append("<video autoplay='1' id='localVideoCamera' />");
            localTracks[i].attach($("#localVideoCamera")[0]);
            $("#localVideoCamera").draggable();
            webcamRoom.addTrack(localTracks[i]);
          } else {
            $("body").append("<video autoplay='1' id='localVideoDesktop" + i + "' />");
            localTracks[i].attach($("#localVideoDesktop" + i)[0]);
          }
      } else {
          $("body").append("<audio autoplay='1' muted='true' id='localAudio" + i + "' />");
          localTracks[i].attach($("#localAudio" + i)[0]);
      }
      if(isJoined) {
        if (localTracks[i].videoType !== "camera") {
          room.addTrack(localTracks[i]);
          webCamRemoteTrack = localTracks[i];
        }
      }
  }
}

function chooseServer() {
  return new Promise(function(resolve, reject) {
    var remote = require('electron').remote;
    var appPath = remote.app.getPath('home');
    var path = require('path');
    var p = path.join(appPath + '/.demio');
    var fs = require('fs');
    fs.exists(p, function(exists) {
      if (exists) {
        SERVER = '147.75.194.19'//'78.46.59.71'
      } else {
        SERVER = '147.75.194.19'//ec2-52-51-12-4.eu-west-1.compute.amazonaws.com';
      }
      console.log("SERVER IP: " + SERVER);
      resolve();
    });
  });
}

chooseServer()
.then(function() {
  initConfig();
  JitsiMeetJS.init(CONFIG);
  start();
});


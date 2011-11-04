function AudioDataNonDescript() {
}

NonDescriptSource = function (sampleRate) {
    this.audioParameters = new AudioParameters(1, sampleRate);

    this.read = function(soundData) {
        // In place.
        ND.process (soundData);
        return soundData.length;
    };
}

AudioDataNonDescript.prototype.init = function (audioParameters) {
  this.sampleRate = audioParameters.sampleRate;
  this.currentSoundSample = 0;
  /* todo we want a new() here */
  this.NonDescriptDSP = ND;
  /* Distortion implemented in javascript with MozAudio */
  this.NonDescriptDSP.IMPLEMENT_DISTORTION = true;
  this.NonDescriptDSP.init(this.sampleRate);
  this.audioSource = new NonDescriptSource(this.sampleRate);
  this.audioDestination = new AudioDataDestination();
  this.audioDestination.autoLatency = true;
  this.audioDestination.writeAsync(this.audioSource);
};

AudioDataNonDescript.prototype.noteOn = function (noteNum, velocity) {
    console.log("note received is ", noteNum);
    if(ND.noteson === 0) {
        ND.freq = ND.tfreq = 440 * Math.pow(2, (noteNum) / 12);
        ND.amp = 1;
        ND.vel = velocity;
        ND.env = ND.vel / 127;
        ND.cdelay = 0;
    }

    else {
        ND.tfreq = 440.0 * Math.pow (2, (noteNum) / 12);
    }
    ND.noteson += 1;
}

AudioDataNonDescript.prototype.noteOff = function (noteNum) {
    ND.noteson -= 1;
    if (ND.noteson < 0) {
        ND.noteson = 0;
    }
}

AudioDataNonDescript.prototype.setCutoff = function (cutoffValue) {
    ND.cutoff = cutoffValue;
}

AudioDataNonDescript.prototype.setResonance = function (resValue) {
    ND.resonance = resValue;
}

AudioDataNonDescript.prototype.setPortamento = function (portValue) {
    ND.portamento = portValue;
}

AudioDataNonDescript.prototype.setRelease = function (relValue) {
    ND.release = relValue;
}

AudioDataNonDescript.prototype.setEnvelope = function (envValue) {
    ND.envmod = envValue;
}

AudioDataNonDescript.prototype.setVolume = function (volValue) {
    ND.volume = volValue;
}

AudioDataNonDescript.prototype.setBypass = function (bypassON) {
    ND.bypass = bypassON;
}

AudioDataNonDescript.prototype.setReverb = function (revValue) {
    console.log ("Reverb not implemented!");
}

AudioDataNonDescript.prototype.setDistortion = function (distValue) {
    var distCorrect = distValue;
    if (distValue < -1) {
        distCorrect = -1;
    }
    if (distValue >= 1) {
        distCorrect = 0.985;
    }
    
    ND.dist = distCorrect;
}



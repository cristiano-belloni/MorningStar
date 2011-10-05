function WAAMorningStar() {
}

WAAMorningStar.prototype.process = function(event) {
    // Get left/right input and output arrays
    var outputArray = event.outputBuffer.getChannelData(1);
    ND.process (outputArray);
}

WAAMorningStar.prototype.init = function (audioParameters) {
    
    this.context = new webkitAudioContext();

    /* todo we want a new() here */
    this.NonDescriptDSP = ND;
    this.NonDescriptDSP.init(this.context.sampleRate);

    this.source = this.context.createJavaScriptNode(2048, 0, 1);
    this.source.onaudioprocess = this.process;
    this.source.connect(this.context.destination);
};

WAAMorningStar.prototype.noteOn = function (noteNum, velocity) {
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

WAAMorningStar.prototype.noteOff = function (noteNum) {
    ND.noteson -= 1;
    if (ND.noteson < 0) {
        ND.noteson = 0;
    }
}

WAAMorningStar.prototype.setCutoff = function (cutoffValue) {
    ND.cutoff = cutoffValue;
}

WAAMorningStar.prototype.setResonance = function (resValue) {
    ND.resonance = resValue;
}

WAAMorningStar.prototype.setPortamento = function (portValue) {
    ND.portamento = portValue;
}

WAAMorningStar.prototype.setRelease = function (relValue) {
    ND.release = relValue;
}

WAAMorningStar.prototype.setEnvelope = function (envValue) {
    ND.envmod = envValue;
}

WAAMorningStar.prototype.setVolume = function (volValue) {
    ND.volume = volValue;
}

WAAMorningStar.prototype.setBypass = function (bypassON) {
    ND.bypass = bypassON;
}



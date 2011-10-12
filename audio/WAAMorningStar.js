function WAAMorningStar() {
}

WAAMorningStar.prototype.createWSCurve = function (amount, n_samples) {
    
    if ((amount >= 0) && (amount < 1)) {
        
        ND.dist = amount;

        var k = 2 * ND.dist / (1 - ND.dist);

        for (var i = 0; i < n_samples; i+=1) {
            // LINEAR INTERPOLATION: x := (c - a) * (z - y) / (b - a) + y
            // a = 0, b = 2048, z = 1, y = -1, c = i
            var x = (i - 0) * (1 - (-1)) / (n_samples - 0) + (-1);
            this.wsCurve[i] = (1 + k) * x / (1+ k * Math.abs(x));
        }
   
    }
}

WAAMorningStar.prototype.process = function(event) {
    // Get left/right input and output arrays
    var outputArray = event.outputBuffer.getChannelData(1);
    ND.process (outputArray);
}

WAAMorningStar.prototype.init = function (audioParameters) {
    
    this.nSamples = 2048;
    this.wsCurve = new Float32Array(this.nSamples);
    
    this.context = new webkitAudioContext();

    /* todo we want a new() here */
    this.NonDescriptDSP = ND;
    // Distortion is done by a waveshaper node, no need to do it in the process() call
    ND.IMPLEMENT_DISTORTION = false;
    // Start with no distortion. TODO don't like it here.
    this.setDistortion(0);
    
    this.NonDescriptDSP.init(this.context.sampleRate);
    
    // Create the sigmoid curve for  the waveshaper.
    this.createWSCurve(ND.dist, this.nSamples);
    this.sigmaDistortNode = this.context.createWaveShaper();
    this.sigmaDistortNode.curve = this.wsCurve;
    
    this.source = this.context.createJavaScriptNode(this.nSamples, 0, 1);
    this.source.onaudioprocess = this.process;
    //this.source.connect(this.context.destination);

    //this.delayStage = this.context.createDelayNode();
    //this.source.connect(this.delayStage);
    //this.delayStage.connect(this.context.destination);
   
    this.source.connect(this.sigmaDistortNode);
    this.sigmaDistortNode.connect(this.context.destination);
    
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

WAAMorningStar.prototype.setReverb = function (revValue) {
    this.delayStage.delayTime.value = revValue;
}

WAAMorningStar.prototype.setDistortion = function (distValue) {
    var distCorrect = distValue;
    if (distValue < -1) {
        distCorrect = -1;
    }
    if (distValue >= 1) {
        distCorrect = 0.985;
    }
    //ND.dist = distCorrect;
    this.createWSCurve (distCorrect, this.nSamples);
    console.log ("ND.dist is ", ND.dist);
}


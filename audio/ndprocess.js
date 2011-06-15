var ND = {
    phase : 0,
    freq : 440,
    tfreq : 440,
    amp : 0,
    env : 0,
    fcutoff : 0,
    fspeed : 0,
    fpos : 0,
    freso: 0,
    lastsample : 0,
    /* int */          noteson : 0,
    /* unsigned int */ vel : 0,
    /* unsigned int */ cdelay : 0,
    /* unsigned int */ release : 100,
    /* unsigned int */ cutoff : 50,
    /* unsigned int */ envmod : 80,
    /* unsigned int */ resonance : 100,
    /* unsigned int */ volume : 100,
    /* unsigned int */ portamento : 64
};

ND.tanh = function (arg) {
    return (Math.exp(2 * arg) - 1) / (Math.exp(2 * arg) + 1);
}

ND.process = function (data) {

var /*int*/ i;

    if (this.bypass === false) {
        for( i = 0; i < data.length; i+=1) {
            if(this.cdelay <= 0) {

                this.freq = ((this.portamento / 127) * 0.9) * this.freq + (1 - ((this.portamento / 127) * 0.9)) * this.tfreq;

                if(this.noteson > 0) {
                    this.amp *= 0.99;
                }
                else {
                    this.amp *= 0.5;
                }

                this.env *= 0.8 + Math.pow (this.release / 127, 0.25) / 5.1;
                this.fcutoff = Math.pow (this.cutoff / 127, 2) + Math.pow (this.env, 2) * Math.pow (this.envmod / 127, 2);
                this.fcutoff = this.tanh(this.fcutoff);
                this.freso = Math.pow (this.resonance / 130, 0.25);
                this.cdelay = Math.floor(this.sampleRate / 100);
            }
            this.cdelay--;

            this.max = this.sampleRate / this.freq;
            this.sample = (this.phase / this.max) * (this.phase / this.max) - 0.25;
            this.phase++;
            if( this.phase >= this.max )
            this.phase -= this.max;

            if (this.vel > 100) {
                this.sample *= this.env;
            }
            else {
                this.sample *= this.amp;
            }

            this.fpos += this.fspeed;
            this.fspeed *= this.freso;
            this.fspeed += (this.sample - this.fpos) * this.fcutoff;
            this.sample = this.fpos;

            this.sample = this.sample * 0.5 + this.lastsample * 0.5;
            this.lastsample = this.sample;

            data[i] = this.sample * (this.volume / 127);
        }
    }
}

ND.init = function (sampleRate) {
    this.sampleRate = sampleRate;
    this.phase = 0;
    this.freq = 440;
    this.tfreq = 440;
    this.amp = 0;
    this.fcutoff = 0;
    this.fspeed = 0;
    this.fpos = 0;
    this.lastsample = 0;
    this.noteson = 0;
    this.cdelay = Math.floor(sampleRate / 100);

    /* These are to be set externally */
    this.release = 100;
    this.cutoff = 50;
    this.envmod = 80;
    this.resonance = 100;
    this.volume = 100;
    this.portamento = 64;
}
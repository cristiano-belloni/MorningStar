var MORNINGSTAR = {
            steps_array : ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16"],
            sequenceStep : -1,
            sequenceStepGroup: 0,
            status: {
                steps: [],
                numberOfPatterns : 1,
                currentEditPattern : 0
            },
            STEPS_NUM : 64,
            VELOCITY_DEFAULT : 64,
            PATTERN_NUM: 4,
            STEPS_PER_PATTERN: 16,
            keys : [],
            playKeys : [],
            highlights : [],
            instrKnobs : [],
            globalKnobs : [],
            pianoRollKeys : [],
            bpButtons : {},
            greenLeds : [],
            redLeds : [],
            currentStep : 0,
            currentHLStep : 0,
            audioOk : false
        };

        MORNINGSTAR.logError = function (status) {
            console.log(status);
        }

        // CALLBACKS

        // PLAY / STOP BUTTON
        MORNINGSTAR.uiPlayStartStop = function (state) {

            // Sequencer is starting, set the unclickable controls.

            // Keys
            for (var i = 0, len = this.steps_array.length; i < len; i+=1) {
                this.ui.setClickable(this.keys[i].ID, state);
            }

            // Highlights
            for (var i = 0, len = this.steps_array.length; i < len; i+=1) {
                this.ui.setClickable(this.highlights[i].ID, state);
            }

            // Piano Roll
            for (var i = 0; i < this.pianoRollKeys.length; i+=1) {
                this.pianoRollKeys[i].setClickable (state);
            }

            if ((state === true) && (this.sequenceStep !== -1)) {
                // Set the last play key as invisible
                this.ui.setVisible(this.playKeys[this.sequenceStep].ID, false);
                // Set the last real key as visible
                this.ui.setVisible(this.keys[this.sequenceStep].ID, true);
            }
        }


        MORNINGSTAR.sequencerRoutine = function () {

            var step = this.sequenceStep;
            // TODO this will be "length" no more.
            var nextStep = (step + 1) % this.keys.length;

            // Play note
            // TODO this will become "active"
            if (this.keys[nextStep].getValue("buttonvalue") === 1) {
                if (this.audioOk === true) {
                    // If the next step is active, turn the playing note off.
                    this.ADNonDescript.noteOff();
                    // If there really is a note (not a pause), play it.
                    if (this.status.steps[nextStep].note !== -1) {
                        this.ADNonDescript.noteOn(this.status.steps[nextStep].note - 33, 64);
                    }
                }

            }

            if (this.sequenceStep !== -1) {
                //Restore previous key
                //play key becomes invisible
                this.ui.setVisible(this.playKeys[step].ID, false);
                //i/o key becomes visible
                this.ui.setVisible(this.keys[step].ID, true);
                //and unclickable, again
                this.ui.setClickable(this.keys[step].ID, false);
            }

            //i/o key is invisible
            this.ui.setVisible(this.keys[nextStep].ID, false);
            //play key becomes visible
            this.ui.setVisible(this.playKeys[nextStep].ID, true);
            //increment position
            this.sequenceStep = nextStep;
            // This could be conditional, if refresh() takes too much time.
            this.ui.refresh();

        }

        MORNINGSTAR.sequencerTimerStart = function () {
            // Calculate intervals given the BPM
            var interval = 60000 / this.tempo_value / 4;
            console.log ("Setting the timer to ", interval, " seconds");
            // Create the timer
            this.sequencerTimer = setInterval(this.sequencerRoutine.bind(MORNINGSTAR), interval);

        }

        MORNINGSTAR.sequencerTimerStop = function () {
            clearInterval(this.sequencerTimer);
        }

        MORNINGSTAR.bpCallback = function (slot, value, elName)  {

            if (value === 1) {
                // Stop the timer
                this.sequencerTimerStop.call(this);

                // Pepare UI for i/o mode
                console.log ("Stopping the sequencer");
                this.uiPlayStartStop.call(this, true);
            }
            else if (value === 0) {
                // Pepare UI for play mode
                console.log ("Starting the sequencer");
                this.uiPlayStartStop.call(this, false);

                // Start the timer
                this.sequencerTimerStart.call(this);
            }
            else {
                // throw
                console.log ("Shouldn't be here!!");
            }
            this.ui.refresh();

        }

        // RESTART BUTTON
        MORNINGSTAR.rsCallback = function (slot, value, elName)  {

            if (value === 1) {
                console.log ("Restart is ON");
            }
            else if (value === 0) {
                console.log ("Restart is OFF");
            }
            else {
                // throw
                console.log ("Shouldn't be here!!");
            }
            this.ui.refresh();

        }

        MORNINGSTAR.pianoSetUnique = function (toSet) {
            this.pianoUnsetAll.call(this, toSet);
            this.pianoSetNote.call(this, toSet);
        }

        MORNINGSTAR.pianoSetNote = function (toSet) {

            // Turn it on on the UI. Do not invoke callbacks.
            this.ui.setValue(toSet, 'buttonvalue', 1, undefined, false);


        }

        MORNINGSTAR.pianoUnsetAll = function (dontUnset) {
            for (var i = 0; i < this.pianoRollKeys.length; i+=1) {
                // Unset all the notes, except the one called dontUnset
                if (this.pianoRollKeys[i].ID !== dontUnset) {
                    if (this.pianoRollKeys[i].getValue ("buttonvalue") === 1) {
                        // Turn it off on the UI. Do not invoke callbacks.
                        this.ui.setValue(this.pianoRollKeys[i].ID, 'buttonvalue', 0, undefined, false);
                    }
                }
            }
        }

        MORNINGSTAR.pianoCallback = function (slot, value, elName)  {

            var noteNumber = parseInt(elName.split('_')[0], 10);

            // This is gonna be deleted and real velocity used TODO
            var velocity = this.VELOCITY_DEFAULT;

            if (this.audioOk === true) {
                // Piano keys are exclusive, so turn off the current note playing
                this.ADNonDescript.noteOff();
            }

            if (value === 1) {
                // Set a new key in the status
                this.status.steps[this.currentStep].note = noteNumber;

                // Set the others to off.
                this.pianoSetUnique.call(this,elName);

                if (this.audioOk === true) {
                    // Play the note in the synth
                    this.ADNonDescript.noteOn(noteNumber - 33, velocity);
                }

                console.log ("Note ", elName, " number ", noteNumber, " for key ", this.currentStep, " is ON!");
            }
            else if (value === 0) {

                // Unset the key in the status
                this.status.steps[this.currentStep].note = -1;

                console.log ("Note ", elName, " number ", noteNumber, " for key ", this.currentStep, " is OFF!");
            }
            else {
                // throw
                console.log ("Shouldn't be here!!");
            }
            this.ui.refresh();
        }

        MORNINGSTAR.pianoKeyChange = function (newStep) {

            if (this.currentStep !== newStep) {
                if (this.audioOk === true) {
                        // currentStep will change. Send a noteOff to truncate playing.
                        this.ADNonDescript.noteOff();
                     }
                // Display the correct note if there is one (aka not -1)
                if (this.status.steps[newStep].note !== -1) {
                    this.pianoSetUnique.call(this, this.status.steps[newStep].note + '_pr');
                }
                // Else, erase every note on the piano roll.
                else {
                    this.pianoUnsetAll.call(this, null);
                }
            }
        }

        MORNINGSTAR.hlChange = function (newStep) {
        if (this.currentHLStep !== newStep) {

                // Set current highlight as invisible
                this.ui.setVisible(this.currentHLStep + '_hl', false);
                // setVisible = false makes it unclickable. Make it clickable again.
                this.ui.setClickable(this.currentHLStep + '_hl', true);
                // Set new highlight as visible, and update currentHLStep
                this.ui.setVisible(newStep + '_hl', true);
                this.currentHLStep = newStep;               
            }
        }

        MORNINGSTAR.hlCallback = function (slot, value, ID) {

            var newStep = parseInt(ID.split('_')[0], 10);
            var newRealStep = newStep + this.STEPS_PER_PATTERN * this.status.currentEditPattern;
            // Change the highlighted slot
            this.hlChange (newStep, newRealStep);
            // Trigger a new note in the piano, if needed
            this.pianoKeyChange (newRealStep);
            // Set the new current step
            this.currentStep = newRealStep;
            
            this.ui.refresh();
        }

        MORNINGSTAR.keyCallback = function (slot, value, ID) {

            var newRealStep = parseInt(ID,10) + this.STEPS_PER_PATTERN * this.status.currentEditPattern;
            
            if (value === 0) {
                this.status.steps[newRealStep].active = 0;
                console.log ("Unset step number " + newRealStep);
            }
            else if (value === 1) {
                this.status.steps[newRealStep].active = 1;
                console.log ("Set step number " + newRealStep);
            }
            else {
                //throw!
            }

            // Change the highlight
            this.hlChange (parseInt(ID,10), newRealStep);
            // Trigger a new note in the piano, if needed
            this.pianoKeyChange (newRealStep);

            // Set the new current step
            this.currentStep = newRealStep;

            this.ui.refresh();

        };

        MORNINGSTAR.plusCallback = function (slot, value, ID) {
            console.log ("Calling plus callback");

            // Set current LED to off
            console.log ("Setting off LED #", this.status.currentEditPattern);
            this.ui.setValue("redled_" + this.status.currentEditPattern, 'buttonvalue', 0);

            var ledToGo = (this.status.currentEditPattern + 1) % this.status.numberOfPatterns;
            // Set current LED + 1 to on
            console.log ("Setting on LED #", ledToGo, " of ", this.status.numberOfPatterns);
            this.ui.setValue("redled_" + ledToGo, 'buttonvalue', 1);
            
            this.switchPattern(ledToGo);

            this.ui.refresh();
        }

        MORNINGSTAR.minusCallback = function (slot, value, ID) {
            console.log ("Calling minus callback");

            // Set current LED to off
            console.log ("Setting off LED #", this.status.currentEditPattern);
            this.ui.setValue("redled_" + this.status.currentEditPattern, 'buttonvalue', 0);

            // Set current LED - 1 to on
            var ledToGo = this.status.currentEditPattern - 1;
            if (ledToGo < 0) {
                ledToGo = this.status.numberOfPatterns - 1;
            }
            console.log ("Setting on LED #", ledToGo, " of ", this.status.numberOfPatterns);
            this.ui.setValue("redled_" + ledToGo, 'buttonvalue', 1);

            this.switchPattern(ledToGo);

            this.ui.refresh();
        }

        MORNINGSTAR.switchSteps = function () {
            // Change the highlighted slot
            for (var i = 0; i < this.STEPS_PER_PATTERN; i+=1) {
                var stepNum = this.STEPS_PER_PATTERN * this.status.currentEditPattern + i;
                this.ui.setValue (i.toString(), 'buttonvalue', this.status.steps[stepNum].active, undefined, false);
            }
            return;
        }

        MORNINGSTAR.switchPattern = function (newpattern) {
            if (this.status.currentEditPattern === newpattern) {
                console.log ("Pattern is the same, not switching");
                return;
            }
            console.log("Switching pattern to", newpattern);
            this.status.currentEditPattern = newpattern;

            this.switchSteps();

            // Current step is changed to where the highlight was
            var newStep = this.STEPS_PER_PATTERN * this.status.currentEditPattern + this.currentHLStep;
            console.log("Switching currentStep to", this.currentStep);
            // Trigger a new note in the piano, if needed
            this.pianoKeyChange (newStep);

            this.currentStep = newStep;

            return;
        }

        MORNINGSTAR.switchCallback = function (slot, value, ID) {
            console.log ("Calling switch callback with value ", value);

            this.status.numberOfPatterns = value + 1;

            if (this.status.currentEditPattern >= this.status.numberOfPatterns) {
                this.ui.setValue("redled_" + this.status.currentEditPattern, 'buttonvalue', 0);
                this.status.currentEditPattern = this.status.numberOfPatterns - 1;
                this.ui.setValue("redled_" + this.status.currentEditPattern, 'buttonvalue', 1);
                this.switchPattern(this.status.currentEditPattern);
            }

            this.ui.refresh();
        }

        MORNINGSTAR.instrKnobCallback = function (slot, value, ID) {
             if (this.audioOk === true) {
                // Interpolate the instrKnobs value in the integer range [0,127]
                var interpolated_value = Math.round(value * 127);
                var functionName = "set" + ID;
                console.log ("Calling ADNonDescript[" + functionName + "] with value " + value + "-->" + interpolated_value);
                this.ADNonDescript[functionName](interpolated_value);
            }
            this.ui.refresh();
        };

        MORNINGSTAR.globalKnobCallback = function (slot, value, ID) {
            if (ID === "Tempo") {
                // Interpolate the globalKnobs value in the integer range [60,180]
                // LINEAR INTERPOLATION: x := (c - a) * (z - y) / (b - a) + y
                // a = 0, b = 1, z = 180, y = 60
                this.tempo_value = Math.round(value *  120 + 60);
                console.log ("TEMPO set to ", this.tempo_value);
            }
            this.ui.refresh();
        };

        MORNINGSTAR.afterLoading = function (loaders) {

            var key_initial_offset = 67 - 43,
                key_distance = 55;

            /* BACKGROUND */

            var backgroundArgs = {
                ID: 'background',
                top: 0,
                left: 0,
                image: loaders["background_loader"].images[0]
                }

            this.background = new Background (backgroundArgs);
            this.ui.addElement(this.background, {zIndex: 1});

            /* KEYS */

            var highlightArgs = {
                left: 0,
                top: 445,
                image: loaders["highlight_loader"].images[0],
                isClickable: true,
                onValueSet: this.hlCallback.bind(MORNINGSTAR)
            };

            var keyArgs = {
                /*ID: "note",*/
                left:  0,
                top: 447,
                preserveBg: false,
                isClickable: true
            };

            keyArgs.onValueSet = this.keyCallback.bind(MORNINGSTAR);

            for (var i = 0; i < this.steps_array.length; i += 1) {
                keyArgs.ID = i;
                keyArgs.imagesArray = loaders[this.steps_array[i] + "_loader"].images;
                keyArgs.left = key_initial_offset + i * key_distance;

                // Highlights on the keys
                highlightArgs.ID = i + '_hl';
                highlightArgs.left = keyArgs.left + 1;
                highlightArgs.ROITop = keyArgs.top - 23;
                highlightArgs.ROIHeight = 20;

                // Create the key
                this.keys[i] = new Button(keyArgs);
                // Create the highlight
                this.highlights[i] = new Background(highlightArgs);

                // Parameters for the play keys, we hijack the key ones
                keyArgs.imagesArray = loaders[this.steps_array[i] + "_pl_loader"].images;
                keyArgs.ID = keyArgs.ID + "_pl";

                // Create the play key
                this.playKeys[i] = new Button(keyArgs);

                // Add the created elements
                this.ui.addElement(this.keys[i], {zIndex: 5});
                this.ui.addElement(this.playKeys[i], {zIndex: 5});
                this.ui.addElement(this.highlights[i], {zIndex: 10});

                // Display the highlight for the current key.
                if (i !== this.currentStep) {
                    this.ui.setVisible(highlightArgs.ID, false);
                }
                this.ui.setClickable(highlightArgs.ID, true);

                // Play keys are invisible by default. They become visible in
                // sequencer mode.
                this.ui.setVisible (keyArgs.ID, false);
            }

            // BYPASS / PLAY / REPEAT BUTTONS

            var bpArgs = {
                top: 153,
                preserveBg: false,
                isClickable: true
            };

            bpArgs.ID = "PlayButton";
            bpArgs.left = 260 - 43;
            bpArgs.imagesArray = loaders["play_loader"].images;
            this.bpButtons['play'] = new Button(bpArgs);
            bpArgs.ID = "StopButton";
            bpArgs.left = 179 - 43;
            bpArgs.imagesArray = loaders["stop_loader"].images;
            bpArgs.onValueSet = this.bpCallback.bind(MORNINGSTAR);
            this.bpButtons['stop'] = new Button(bpArgs);
            bpArgs.ID = "RestartButton";
            bpArgs.left = 343 - 43;
            bpArgs.imagesArray = loaders["restart_loader"].images;
            bpArgs.onValueSet = this.rsCallback.bind(MORNINGSTAR);
            this.bpButtons['restart'] = new Button(bpArgs);

            this.ui.addElement(this.bpButtons['play'], {zIndex: 3});
            this.ui.addElement(this.bpButtons['stop'], {zIndex: 3});
            this.ui.addElement(this.bpButtons['restart'], {zIndex: 3});

            // Cascading here; since the buttons are mutually excusive, we will
            // need only a callback function.
            this.ui.connectSlots ("PlayButton", "buttonvalue", "StopButton", "buttonvalue", {callback: function (value) {return 1-value;}});
            this.ui.connectSlots ("StopButton", "buttonvalue", "PlayButton", "buttonvalue", {callback: function (value) {return 1-value;}});

            /* KNOBS */

            // INSTRUMENT (WHITE) KNOBS

            var  instr_knob_names = [{ID: "Resonance", top: 255, left: 820 - 43},
                                     {ID: "Release", top: 61, left: 820 - 43},
                                     {ID: "Cutoff",  top: 255, left: 641 - 43},
                                     {ID: "Portamento", top: 61, left: 641 - 43}];

            var instrKnobArgs = {
                image : loaders["white_knob_loader"].images[0],
                sensitivity : 5000,
                isClickable: true,
                preserveBg: false,
                initAngValue: 270,
                angSteps : 127,
                startAngValue: 218,
                stopAngValue : 501
            };

            instrKnobArgs.onValueSet = this.instrKnobCallback.bind(MORNINGSTAR);

            for (var i = 0; i < instr_knob_names.length; i ++) {
                instrKnobArgs.ID = instr_knob_names[i].ID;
                instrKnobArgs.top = instr_knob_names[i].top;
                instrKnobArgs.left = instr_knob_names[i].left;
                this.instrKnobs[i] = new RotKnob(instrKnobArgs);
                this.ui.addElement(this.instrKnobs[i],  {zIndex: 10});
            }

            // GLOBAL (BLACK) KNOBS

            var  global_knob_names = [{ID: "Distortion", top: 238, left: 448 - 43},
                                      {ID: "Reverb", top: 240, left: 530 - 43},
                                      {ID: "Tempo", top: 327, left: 449 - 43},
                                      {ID: "Volume", top: 327, left: 527 - 43},
                                      {ID: "Velocity", top: 155, left: 78 - 43}
                                      ];

            var globalKnobArgs = {
                image : loaders["black_knob_loader"].images[0],
                sensitivity : 5000,
                isClickable: true,
                initAngValue: 270,
                angSteps : 120,
                startAngValue: 218,
                stopAngValue : 501
            };

            globalKnobArgs.onValueSet = this.globalKnobCallback.bind(MORNINGSTAR);

            for (var i = 0; i < global_knob_names.length; i ++) {
                globalKnobArgs.ID = global_knob_names[i].ID;
                globalKnobArgs.top = global_knob_names[i].top;
                globalKnobArgs.left = global_knob_names[i].left;
                this.globalKnobs[i] = new RotKnob(globalKnobArgs);
                this.ui.addElement(this.globalKnobs[i],  {zIndex: 10});
            }

            // SWITCH
            var swArgs = {
                ID : "switch",
                top: 69,
                left: 414,
                preserveBg: false,
                isClickable: true,
                imagesArray : loaders["switch_loader"].images,
                onValueSet : this.switchCallback.bind(MORNINGSTAR)
            };

            this.switchButton = new Button(swArgs);
            this.ui.addElement(this.switchButton,  {zIndex: 10});

            // PLUSMINUS
            var pmArgs = {
                ID:"minus_button",
                top: 140,
                left: 416,
                preserveBg: false,
                isClickable: true,
                imagesArray : loaders["minus_loader"].images,
                onValueSet : this.minusCallback.bind(MORNINGSTAR)
            };

            this.minusButton = new Button(pmArgs);
            this.ui.addElement(this.minusButton,  {zIndex: 10});

            pmArgs.ID = "plus_button";
            pmArgs.left = 503;
            pmArgs.imagesArray = loaders["plus_loader"].images;
            pmArgs.onValueSet = this.plusCallback.bind(MORNINGSTAR);

            this.plusButton = new Button(pmArgs);
            this.ui.addElement(this.plusButton,  {zIndex: 10});

            // LEDS
            var ledArgs = {
                preserveBg: false,
                isClickable: false
            };

            for (var i = 0; i < 4; i += 1) {
                // Both
                ledArgs.left = 420 + i * 29;

                // Red
                ledArgs.imagesArray = loaders["redled_loader"].images;
                ledArgs.top = 189;
                ledArgs.ID = "redled_" + i;
                this.redLeds[i] = new Button(ledArgs);
                this.ui.addElement(this.redLeds[i],  {zIndex: 10});

                // Green
                ledArgs.imagesArray = loaders["greenled_loader"].images;
                ledArgs.top = 166;
                ledArgs.ID = "greenled_" + i;
                this.greenLeds[i] = new Button(ledArgs);
                this.ui.addElement(this.greenLeds[i],  {zIndex: 10});

            }

            // PIANO ROLL

            var  pianoKeyData = [
                {ID: "0_pr",   image_ld: "tone_right_loader", left: 73 - 43},
                {ID: "1_pr",  image_ld: "semitone_loader", left: 91 - 43},
                {ID: "2_pr",   image_ld: "tone_both_loader", left: 97  - 43},
                {ID: "3_pr",  image_ld: "semitone_loader",  left: 115 - 43},
                {ID: "4_pr",   image_ld: "tone_left_loader", left: 121 - 43},
                {ID: "5_pr",   image_ld: "tone_right_loader", left: 144 - 43},
                {ID: "6_pr",  image_ld: "semitone_loader", left: 162 - 43},
                {ID: "7_pr",   image_ld: "tone_both_loader", left: 168 - 43},
                {ID: "8_pr",  image_ld: "semitone_loader", left: 186 - 43},
                {ID: "9_pr",   image_ld: "tone_both_loader", left: 192 - 43},
                {ID: "10_pr", image_ld: "semitone_loader", left: 210 - 43},
                {ID: "11_pr",  image_ld: "tone_left_loader", left: 216 - 43},
                {ID: "12_pr",  image_ld: "tone_right_loader", left: 239 - 43},
                {ID: "13_pr", image_ld: "semitone_loader", left: 257 - 43},
                {ID: "14_pr",  image_ld: "tone_both_loader", left: 263 - 43},
                {ID: "15_pr", image_ld: "semitone_loader", left: 280 - 43},
                {ID: "16_pr",  image_ld: "tone_left_loader", left: 286 - 43},
                {ID: "17_pr",  image_ld: "tone_right_loader", left: 310 - 43},
                {ID: "18_pr", image_ld: "semitone_loader", left: 328 - 43},
                {ID: "19_pr",  image_ld: "tone_both_loader", left: 334 - 43},
                {ID: "20_pr", image_ld: "semitone_loader", left: 352 - 43},
                {ID: "21_pr",  image_ld: "tone_both_loader", left: 358 - 43},
                {ID: "22_pr", image_ld: "semitone_loader", left: 376 - 43},
                {ID: "23_pr",  image_ld: "tone_left_loader", left: 382 - 43},
            ];

            var pianoKeyArgs = {
                top: 276,
                preserveBg: false,
                isClickable: true,
                onValueSet: this.pianoCallback.bind(MORNINGSTAR)
            };

            var pianoZIndex;

            for (var i = 0; i < pianoKeyData.length; i += 1) {
                pianoZIndex = 11;
                pianoKeyArgs.ID = pianoKeyData[i].ID;
                pianoKeyArgs.left = pianoKeyData[i].left;
                pianoKeyArgs.imagesArray = loaders[pianoKeyData[i].image_ld].images;
                if (pianoKeyData[i].image_ld === "semitone_loader") {
                    pianoZIndex = 12;
                }

                this.pianoRollKeys.push(new Button(pianoKeyArgs));
                this.ui.addElement(this.pianoRollKeys[i], {zIndex: pianoZIndex});
            }

            this.audioOk = true;
            try {
                this.ADNonDescript = new AudioDataNonDescript();
                this.ADNonDescript.init({sampleRate: 44100});
                this.ADNonDescript.setBypass (false);
            }
            catch (err) {
                console.log ("Catched an exception: ", err, " Audio could be not loaded: ", err.description);
                this.audioOk = false;
            }
            

            // DEFAULTS
            this.ui.setValue('PlayButton', 'buttonvalue', 0);
            // Tempo = 120
            this.ui.setValue('Tempo', 'knobvalue', 0.5);
            this.ui.setValue('Release', 'knobvalue', 100/127);
            this.ui.setValue('Cutoff', 'knobvalue', 50/127);
            this.ui.setValue('Resonance', 'knobvalue', 100/127);
            this.ui.setValue('Volume', 'knobvalue', 100/127);
            this.ui.setValue('Portamento', 'knobvalue', 64/127);

            this.ui.setValue('switch', 'buttonvalue', 0);
            this.ui.setValue('greenled_0', 'buttonvalue', 1);
            this.ui.setValue('redled_0', 'buttonvalue', 1);

            this.ui.refresh();


        }

        MORNINGSTAR.init = function () {
            /* INIT */
            var plugin_canvas = document.getElementById("plugin");
            var CWrapper = K2WRAPPER.createWrapper("CANVAS_WRAPPER",
                                                        {canvas: plugin_canvas}
                                                        );

            this.ui = new UI (plugin_canvas, CWrapper, {breakOnFirstEvent: true});

            var imageResources = [];
            var mulArgs = {multipleImages: [],
                            onComplete: this.afterLoading.bind(MORNINGSTAR),
                            onError: this.logError.bind(MORNINGSTAR)
            }

            // Build the status array.
            for (var i = 0; i < this.STEPS_NUM; i+=1) {
                this.status.steps[i] = {};
                // Not active, by default
                this.status.steps[i].active = 0;
                // Note = -1 means that there is no note associated with the step
                this.status.steps[i].note = -1;
                // This depends on the initial velocity value
                this.status.steps[i].velocity = this.VELOCITY_DEFAULT;
            }

            // Load keys

            // input / output keys
            for (var i = 0; i < this.steps_array.length; i += 1) {
                imageResources = ["Keys/" + this.steps_array[i] + "_inactive.png", "Keys/" + this.steps_array[i] + "_active.png"];
                mulArgs.multipleImages.push ({ID: this.steps_array[i] + "_loader", imageNames : imageResources});
            }
            // play keys
            for (var i = 0; i < this.steps_array.length; i += 1) {
                imageResources = ["Keys/" + this.steps_array[i] + "_playing.png"];
                mulArgs.multipleImages.push ({ID: this.steps_array[i] + "_pl_loader", imageNames : imageResources});
            }

            // Load key highlight
            imageResources = ["Keys/key_highlight.png"];
            mulArgs.multipleImages.push ({ID: "highlight_loader", imageNames : imageResources});


            // Load bypass / play button
            imageResources = ["PlaybackControls/play_inactive.png", "PlaybackControls/play_active.png"];
            mulArgs.multipleImages.push ({ID: "play_loader", imageNames : imageResources});
            imageResources = ["PlaybackControls/stop_inactive.png", "PlaybackControls/stop_active.png"];
            mulArgs.multipleImages.push ({ID: "stop_loader", imageNames : imageResources});
            imageResources = ["PlaybackControls/repeat_inactive.png", "PlaybackControls/repeat_active.png"];
            mulArgs.multipleImages.push ({ID: "restart_loader", imageNames : imageResources});

            // Load piano roll parts
            // Semitone button
            imageResources = ["PianoRoll/semitone_inactive.png", "PianoRoll/semitone_active.png"];
            mulArgs.multipleImages.push ({ID: "semitone_loader", imageNames : imageResources});
            // Tone with two semitones
            imageResources = ["PianoRoll/tone_both_inactive.png", "PianoRoll/tone_both_active.png"];
            mulArgs.multipleImages.push ({ID: "tone_both_loader", imageNames : imageResources});
            // Tone with a left semitone
            imageResources = ["PianoRoll/tone_left_inactive.png", "PianoRoll/tone_left_active.png"];
            mulArgs.multipleImages.push ({ID: "tone_left_loader", imageNames : imageResources});
            // Tone with a right semitone
            imageResources = ["PianoRoll/tone_right_inactive.png", "PianoRoll/tone_right_active.png"];
            mulArgs.multipleImages.push ({ID: "tone_right_loader", imageNames : imageResources});

            // Load instrKnobs rotary part
            mulArgs.multipleImages.push ({ID: "black_knob_loader", imageNames : ["Knobs/Black_small.png"]});
            mulArgs.multipleImages.push ({ID: "white_knob_loader", imageNames : ["Knobs/White_big.png"]});

            // Load switch
            mulArgs.multipleImages.push ({ID: "switch_loader", imageNames : ["Switch/switch_0.png","Switch/switch_1.png","Switch/switch_2.png","Switch/switch_3.png"]});

            // Plus and minus button
            mulArgs.multipleImages.push ({ID: "plus_loader", imageNames : ["PlusMinusButtons/button_plus.png"]});
            mulArgs.multipleImages.push ({ID: "minus_loader", imageNames : ["PlusMinusButtons/button_minus.png"]});

            // Led buttons
            mulArgs.multipleImages.push ({ID: "redled_loader", imageNames : ["Led/LedRed_off.png", "Led/LedRed_on.png"]});
            mulArgs.multipleImages.push ({ID: "greenled_loader", imageNames : ["Led/LedGreen_off.png", "Led/LedGreen_on.png"]});

            // Load bg
            mulArgs.multipleImages.push ({ID: "background_loader", imageNames : ["MS_deck.png"]});

            var mImageLoader = new loadMultipleImages (mulArgs);

        }
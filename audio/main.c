/*
*    This file is part of SO-404.
*
*    SO-404 is free software: you can redistribute it and/or modify
*    it under the terms of the GNU General Public License as published by
*    the Free Software Foundation, either version 3 of the License, or
*    (at your option) any later version.
*
*    SO-404 is distributed in the hope that it will be useful,
*    but WITHOUT ANY WARRANTY; without even the implied warranty of
*    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*    GNU General Public License for more details.
*
*    You should have received a copy of the GNU General Public License
*    along with SO-404.  If not, see <http://www.gnu.org/licenses/>.
*/

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <math.h>
#include <signal.h>

#include <jack/jack.h>

#include <alsa/asoundlib.h>

int done;

unsigned int samplerate;
double phase, freq, tfreq, max;
double amp, lastsample, sample;
double fcutoff, fspeed, fpos, freso;
unsigned int release, envmod, cutoff, resonance, volume, portamento;
unsigned int cdelay;
int noteson;

jack_port_t *outport;

void sig_exit( int sig )
{
	puts( "Got SINGINT or SIGTERM, shutting down" );
	done = 1;
}

void jack_shutdown( void *arg )
{
	puts( "Jack kicked us, were boned" );
	exit( 1 );
}

int process( jack_nframes_t nframes, void *arg )
{
	jack_default_audio_sample_t *outbuffer;
	int i;

	outbuffer = (jack_default_audio_sample_t *) jack_port_get_buffer( outport, nframes );

	for( i=0; i<nframes; i++ )
	{
		if( cdelay <= 0 )
		{
			freq = ((portamento/127.0)*0.9)*freq + (1.0-((portamento/127.0)*0.9))*tfreq;
			
			if( noteson > 0 )
				amp *= 0.8+(release/127.0)/5.1;
			else
				amp *= 0.5;
			
			fcutoff = pow(cutoff/127.0,5.0)+amp*amp*pow(envmod/128.0,2.0);
			if( fcutoff > 1.0 ) fcutoff = 1.0;
			fcutoff = sin(fcutoff*M_PI/2.0);
			freso = pow(resonance/127.0,0.25);
			cdelay = samplerate/100;
		}
		cdelay--;
		
		max = samplerate / freq;
		sample = (phase/max)*(phase/max)-0.25;
		phase++;
		if( phase >= max )
		phase -= max;
		
		sample *= amp;

		fpos += fspeed;
		fspeed *= freso;
		fspeed += (sample-fpos)*fcutoff;
		sample = fpos;

		sample = sample*0.5+lastsample*0.5;
		lastsample = sample;

		outbuffer[i] = sample * (volume/127.0);
	}
	
	return 0;
}

int main( int argc, char *argv[] )
{
	jack_client_t *jackClient;
	snd_seq_t *seqport;
	struct pollfd *pfd;
	int npfd;
	snd_seq_event_t *midievent;
	int channel, midiport;

	puts( "SO-404 v.1.1 by 50m30n3 2009-2011" );

	if( argc > 1 )
		channel = atoi( argv[1] );
	else
		channel = 0;

	signal( SIGINT, sig_exit );
	signal( SIGTERM, sig_exit );

	puts( "Connecting to Jack Audio Server" );

	jackClient = jack_client_open( "SO-404", JackNoStartServer, NULL );
	if( jackClient == NULL )
	{
		fputs( "Cannot connect to Jack server\n", stderr );
		return 1;
	}

	jack_on_shutdown( jackClient, jack_shutdown, 0 );
	outport = jack_port_register( jackClient, "output", JACK_DEFAULT_AUDIO_TYPE, JackPortIsOutput | JackPortIsTerminal, 0 );
	jack_set_process_callback( jackClient, process, 0 );
	samplerate = jack_get_sample_rate( jackClient );

	phase = 0.0;
	freq = 440.0;
	tfreq = 440.0;
	amp = 0.0;
	fcutoff = 0.0;
	fspeed = 0.0;
	fpos = 0.0;
	lastsample = 0.0;
	noteson = 0;
	cdelay = samplerate/100;
	
	release = 100;
	cutoff = 50;
	envmod = 80;
	resonance = 100;
	volume = 100;
	portamento = 64;

	jack_activate( jackClient );

	printf( "Listening on MIDI channel %i\n", channel );

	if( snd_seq_open( &seqport, "default", SND_SEQ_OPEN_INPUT, 0 ) < 0 )
	{
		fputs( "Cannot connect to ALSA sequencer\n", stderr );
		return 1;
	}

	snd_seq_set_client_name( seqport, "SO-404" );

	midiport = snd_seq_create_simple_port( seqport, "input",
			SND_SEQ_PORT_CAP_WRITE|SND_SEQ_PORT_CAP_SUBS_WRITE,
			SND_SEQ_PORT_TYPE_APPLICATION );

	if( midiport < 0 )
	{
		fputs( "Cannot create ALSA sequencer port\n", stderr );
		return 1;
	}

	npfd = snd_seq_poll_descriptors_count( seqport, POLLIN );
	pfd = (struct pollfd *)malloc( npfd * sizeof( struct pollfd ) );
	snd_seq_poll_descriptors( seqport, pfd, npfd, POLLIN );

	done = 0;

	while( ! done )
	{
		if( poll( pfd, npfd, 100000 ) > 0 )
		{
			do
			{
				snd_seq_event_input( seqport, &midievent );
				
				if( ( midievent->type == SND_SEQ_EVENT_NOTEON ) && ( midievent->data.note.channel == channel ) )
				{
					if( noteson == 0 )
					{
						freq = tfreq = 440.0*pow( 2.0, (midievent->data.note.note-69) / 12.0 );
						amp = midievent->data.note.velocity/127.0;
						cdelay = 0;
					}
					else
					{
						tfreq = 440.0*pow( 2.0, (midievent->data.note.note-69) / 12.0 );
					}
				
					noteson += 1;
				}
				else if( ( midievent->type == SND_SEQ_EVENT_NOTEOFF ) && ( midievent->data.note.channel == channel ) )
				{
					noteson -= 1;
				}
				else if( ( midievent->type == SND_SEQ_EVENT_CONTROLLER ) && ( midievent->data.control.channel == channel ) )
				{
					if( midievent->data.control.param == 74 )
					{
						cutoff = midievent->data.control.value;
						printf( "Cutoff: %i     \r", cutoff );
						fflush( stdout );
					}
					else if( midievent->data.control.param == 7 )
					{
						volume = midievent->data.control.value;
						printf( "Volume: %i     \r", volume );
						fflush( stdout );
					}
					else if( midievent->data.control.param == 65 )
					{
						portamento = midievent->data.control.value;
						printf( "Portamento: %i     \r", portamento );
						fflush( stdout );
					}
					else if( midievent->data.control.param == 72 )
					{
						release = midievent->data.control.value;
						printf( "Release: %i     \r", release );
						fflush( stdout );
					}
					else if( midievent->data.control.param == 79 )
					{
						envmod = midievent->data.control.value;
						printf( "Envelope: %i     \r", envmod );
						fflush( stdout );
					}
					else if( midievent->data.control.param == 71 )
					{
						resonance = midievent->data.control.value;
						printf( "Resonance: %i     \r", resonance );
						fflush( stdout );
					}
				}
				
				snd_seq_free_event( midievent );
			}
			while( snd_seq_event_input_pending( seqport, 0 ) > 0 );
		}
	}

	free( pfd );
	snd_seq_delete_port( seqport, midiport );
	snd_seq_close( seqport );

	jack_deactivate( jackClient );
	jack_port_unregister( jackClient, outport );

	jack_client_close( jackClient );

	return 0;
}


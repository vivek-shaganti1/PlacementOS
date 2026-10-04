# Synthesizes the film's score and UI sound effects with ffmpeg (no third-party audio).
import subprocess, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio')
os.makedirs(OUT, exist_ok=True)
SR = 48000

def run(expr, dur, name, af):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
                    f"aevalsrc='{expr}':s={SR}:d={dur}", '-af', af, '-ar', str(SR), os.path.join(OUT, name)], check=True)

# ---------------------------------------------------------------- score (100 s)
chords = [  # Am, F, C, G voicings
    [110.00, 220.00, 261.63, 329.63],
    [87.31, 220.00, 261.63, 349.23],
    [130.81, 196.00, 261.63, 329.63],
    [98.00, 196.00, 246.94, 293.66],
]
def pick(v):
    a, b, c, d = (ch[v] for ch in chords)
    return f"if(eq(mod(floor(t/8),4),0),{a},if(eq(mod(floor(t/8),4),1),{b},if(eq(mod(floor(t/8),4),2),{c},{d})))"
seg = "min(1,min(mod(t,8)/1.4,(8-mod(t,8))/1.4))"
pad = "+".join(f"(sin(2*PI*{pick(v)}*t)+0.6*sin(2*PI*{pick(v)}*1.004*t))*{[0.5,0.32,0.26,0.2][v]}" for v in range(4))
# Gentle build, a breath before the final reveal, open chord at the end.
master = "min(1,t/5)*if(lt(t,91),1,if(lt(t,92.5),0.35,1))*if(gt(t,96),max(0,(100-t)/4),1)"
pulse_amp = "if(lt(t,22),0,if(lt(t,61),0.25+0.35*(t-22)/39,if(lt(t,72),0.75,if(lt(t,90.5),0.6,0))))"
kick = f"{pulse_amp}*sin(2*PI*(48+110*exp(-28*mod(t,0.6)))*mod(t,0.6))*exp(-7*mod(t,0.6))"
arp_amp = "if(lt(t,48),0,if(lt(t,61),0.06,if(lt(t,72),0.12,if(lt(t,90.5),0.07,0))))"
arp_f = f"({pick(1)}*2*if(eq(mod(floor(t/0.3),4),0),1,if(eq(mod(floor(t/0.3),4),1),1.5,if(eq(mod(floor(t/0.3),4),2),2,1.5))))"
arp = f"{arp_amp}*sin(2*PI*{arp_f}*t)*exp(-9*mod(t,0.3))"
final = "if(gt(t,91.5),min(1,(t-91.5)/1.2)*0.18*(sin(2*PI*220*t)+sin(2*PI*329.63*t)+0.7*sin(2*PI*493.88*t)+0.6*sin(2*PI*659.25*t)+0.5*sin(2*PI*110*t)),0)"
score = f"({master})*(0.11*({pad})*{seg}+{kick}*0.55+{arp}+{final})"
run(score, 100, 'score.wav', 'lowpass=f=5200,aecho=0.8:0.6:90|180|310:0.28|0.18|0.1,volume=0.9,afade=t=out:st=97:d=3')

# ---------------------------------------------------------------- sound effects
run("0.6*sin(2*PI*2400*t)*exp(-90*t)+0.25*(random(0)*2-1)*exp(-160*t)", 0.12, 'click.wav', 'highpass=f=900,lowpass=f=7000,volume=0.8')
run("(random(0)*2-1)*sin(PI*t/0.7)^2", 0.7, 'whoosh.wav', 'bandpass=f=900:width_type=o:w=2,lowpass=f=3000,volume=0.55,afade=t=in:d=0.2')
run("0.4*(sin(2*PI*880*t)+0.6*sin(2*PI*1318.5*t)+0.3*sin(2*PI*1760*t))*exp(-4*t)", 1.4, 'chime.wav', 'aecho=0.8:0.5:120:0.3,volume=0.6')
run("0.8*sin(2*PI*(40+70*exp(-6*t))*t)*exp(-2.2*t)", 2.2, 'impact.wav', 'lowpass=f=400,aecho=0.8:0.6:200:0.3,volume=1.1')
run("0.3*sin(2*PI*(300+900*t)*t)*sin(PI*t/1.2)", 1.2, 'process.wav', 'tremolo=f=14:d=0.5,lowpass=f=2400,volume=0.5')
run("0.3*(random(0)*2-1)*exp(-120*mod(t,0.07))", 1.2, 'typing.wav', 'bandpass=f=3000:width_type=o:w=1.5,volume=0.5')
print('ok')

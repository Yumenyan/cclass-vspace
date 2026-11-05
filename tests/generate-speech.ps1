$ErrorActionPreference = 'Stop'
# Generate a local regression fixture; no microphone or external service is used.
Add-Type -AssemblyName System.Speech
$fixtureDirectory = Join-Path $PSScriptRoot 'fixtures'
New-Item -ItemType Directory -Force -Path $fixtureDirectory | Out-Null
$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $synthesizer.SetOutputToWaveFile((Join-Path $fixtureDirectory 'speech.wav'))
    $synthesizer.Rate = 0
    $synthesizer.Speak('This is a voice clarity test. A clear voice should remain audible while background noise is reduced.')
} finally {
    $synthesizer.Dispose()
}

# MP4 Export Pipeline

## Fixed failure modes

The browser MP4 exporter previously passed encoded video chunks directly to `mp4-muxer`. In some Chromium environments the chunks did not expose a usable duration, which caused `addVideoChunkRaw` to reject an invalid duration. The first encoded chunk could also arrive without decoder configuration metadata, leaving the muxer unable to create the `stsd` video sample description during `finalize()`.

The native path now inserts video through `addVideoChunkRaw` with a validated non-negative timestamp and a frame-duration fallback derived from FPS. It buffers encoded chunks until WebCodecs supplies `decoderConfig`, then applies the configuration to the first muxed sample. If metadata never arrives, export fails with an explicit diagnostic instead of producing a corrupt file.

## Audio behavior

When timeline audio is enabled and a cue is selected, the exporter creates a deterministic offline audio render from the same timeline cue times used by preview playback. WebCodecs AAC is preferred when supported. Opus is selected as a browser-compatible fallback when AAC is unavailable; the resulting Opus track is muxed into the MP4 container and is verified by `ffprobe`.

Browsers without native H.264 WebCodecs support continue to use the existing WASM H.264 exporter. If audio is enabled, `fallbackAudioMp4.ts` parses the generated video-only MP4 with MP4Box, extracts the H.264 samples and AVC configuration record, and remuxes those samples with the deterministic AAC/Opus track through `mp4-muxer`.

> MP4 audio is intentionally enabled only for MP4. WebM and GIF retain their existing export behavior and remain video-only unless their dedicated audio pipelines are implemented separately.

## Verification contract

`tests/export-media-probe.mjs` enables the Key Tap timeline cue before exporting. It requires a valid video stream for both MP4 and WebM, and additionally requires an audio stream in MP4. The regression uses `ffprobe` to validate the container and stream structure rather than relying only on a browser download event.

The expected MP4 stream shape in Chromium environments without H.264 WebCodecs is:

| Stream | Expected codec | Required |
| --- | --- | --- |
| Video | H.264/AVC | Yes |
| Audio | AAC when available, otherwise Opus | Yes when timeline audio is enabled |

The fallback and native paths share the same `ExportOptions.audio`, timeline timing, playback-speed normalization, and audio cue implementation, so the audio start times remain aligned with the exported animation.

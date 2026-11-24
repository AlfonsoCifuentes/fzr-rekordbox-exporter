import { describe, it, expect } from 'vitest'
import { parseVirtualDjXml } from '../../core/virtualdj/parseVirtualDjXml'
import { parseRekordboxFile } from '../../core/rekordbox/parseRekordboxFile'

const SAMPLE_VDJ = `<?xml version="1.0" encoding="UTF-8"?>
<VirtualDJ_Database Version="8.5">
  <Song FilePath="C:\\Music\\Techno\\Track One.mp3" FileSize="9000000">
    <Tags Author="Charlotte de Witte" Title="Doppler" Album="Formula" Genre="Techno" Year="2021" Stars="5"/>
    <Infos SongLength="398.5" Bitrate="320"/>
    <Scan Bpm="0.434783" Key="1A"/>
    <Poi Name="Drop" Pos="32.0" Num="1" Type="cue"/>
    <Poi Name="Break Loop" Pos="120.0" Size="8.0" Num="2" Type="loop"/>
  </Song>
</VirtualDJ_Database>`

describe('parseVirtualDjXml', () => {
  it('parses VirtualDJ XML database with seconds-per-beat BPM and Poi cues/loops', () => {
    const res = parseVirtualDjXml(SAMPLE_VDJ, 'vdj_set.xml')
    expect(res.tracks).toHaveLength(1)
    const t = res.tracks[0]
    expect(t.artist).toBe('Charlotte de Witte')
    expect(t.name).toBe('Doppler')
    expect(t.bpm).toBeCloseTo(138, 0)
    expect(t.key).toBe('1A')
    expect(t.location).toBe('C:/Music/Techno/Track One.mp3')
    expect(t.cuePoints).toHaveLength(2)
    expect(t.cuePoints![0]).toMatchObject({ name: 'Drop', type: 0, startMs: 32000, hotCueIndex: 0 })
    expect(t.cuePoints![1]).toMatchObject({ name: 'Break Loop', type: 4, startMs: 120000, endMs: 128000, hotCueIndex: 1 })
  })

  it('auto-detects VirtualDJ XML inside parseRekordboxFile', () => {
    const res = parseRekordboxFile(SAMPLE_VDJ, 'database.xml')
    expect(res.tracks).toHaveLength(1)
    expect(res.tracks[0].name).toBe('Doppler')
  })
})

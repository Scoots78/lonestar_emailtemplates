import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import Field from './Field'

// Base path for API requests (injected at build time via Vite define)
const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

type SchemaField = { key:string; label:string; type:'text'|'textarea'|'url'|'color'; required?:boolean; }
type Schema = { title:string; fields: SchemaField[] }

const TPL_DEFAULT = 'confirmation'

export default function App(){
  const [venues, setVenues] = useState<string[]>([])
  const [templates, setTemplates] = useState<string[]>([])
  const [venue, setVenue] = useState<string>('') // No default value
  const [templateKey, setTemplateKey] = useState<string>(TPL_DEFAULT)
  const [schema, setSchema] = useState<Schema | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [html, setHtml] = useState<string>('')

  useEffect(() => {
    axios.get(`${API_BASE}/api/venues`).then(r => {
      const venueList = r.data.venues || []
      setVenues(venueList)
      if (!venue && venueList.length > 0) {
        setVenue(venueList[0]) // Set first venue as default if not set
      }
    })
    axios.get(`${API_BASE}/api/templates`).then(r => setTemplates(r.data.templates || []))
  }, [])

  useEffect(() => {
    if(!venue) return
    axios.get(`${API_BASE}/api/venues/`+venue).then(r => setValues(r.data))
  }, [venue])

  useEffect(() => {
    if(!templateKey) return
    axios.get(`${API_BASE}/api/schema/`+templateKey).then(r => setSchema(r.data.schema))
  }, [templateKey])

  useEffect(() => {
    const run = setTimeout(() => {
      if(!venue || !templateKey) return
      axios.post(`${API_BASE}/api/preview`, { templateKey, venueKey: venue, overrides: values })
        .then(r => setHtml(r.data.html || ''))
        .catch(() => setHtml('<p style="padding:16px;font-family:Arial">Preview error.</p>'))
    }, 250)
    return () => clearTimeout(run)
  }, [venue, templateKey, values])

  function onChange(key:string, val:any){
    setValues(v => ({...v, [key]: val}))
  }

  function saveVenue(){
    axios.put(`${API_BASE}/api/venues/`+venue, values).then(() => alert('Saved!')).catch(e => alert('Save failed: '+e))
  }

  const renderUrl = useMemo(() => `${API_BASE}/render/${templateKey}?venue=${encodeURIComponent(venue)}`, [templateKey, venue])

  return (
    <div className="container">
      <div className="sidebar">
        <div className="field">
          <label>Venue</label>
          <select value={venue} onChange={e => setVenue(e.target.value)}>
            {venues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Template</label>
          <select value={templateKey} onChange={e => setTemplateKey(e.target.value)}>
            {templates.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {schema && schema.fields.map(f => (
          <Field key={f.key} field={f} value={values[f.key] ?? ''} onChange={onChange} />
        ))}

        <div className="actions">
          <button className="primary" onClick={saveVenue}>Save Venue JSON</button>
          <a href={renderUrl} target="_blank" rel="noreferrer">
            <button>Export Final HTML</button>
          </a>
        </div>
        <p className="small">Changes are auto-previewed; click Save to persist JSON.</p>
      </div>
      <div className="preview">
        <iframe title="preview" srcDoc={html} />
      </div>
    </div>
  )
}

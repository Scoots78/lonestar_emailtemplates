import React from 'react'

type Props = {
  field: { key:string; label:string; type:'text'|'textarea'|'url'|'color'; required?:boolean }
  value: any
  onChange: (key:string, val:any) => void
}

export default function Field({ field, value, onChange }: Props){
  const id = 'f_'+field.key
  return (
    <div className="field">
      <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>
      {field.type === 'textarea' ? (
        <textarea id={id} rows={3} value={value || ''} onChange={e => onChange(field.key, e.target.value)} />
      ) : (
        <input id={id} type={field.type === 'url' ? 'url' : (field.type === 'color' ? 'color' : 'text')} value={value || ''} onChange={e => onChange(field.key, e.target.value)} />
      )}
    </div>
  )
}

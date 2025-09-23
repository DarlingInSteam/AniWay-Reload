import { useState } from 'react'
import { useCreateCategory } from '@/hooks/useForum'
import { Link, useNavigate } from 'react-router-dom'

export function CreateCategoryPage() {
  const create = useCreateCategory()
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', description: '', icon: '', color: '#2d4cff', displayOrder: 0 })

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/forum" className="hover:text-white">Форум</Link>
        <span>/</span>
        <span className="text-white">Новая категория</span>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-white tracking-tight">Создание категории</h1>
      <form className="space-y-5" onSubmit={e=> { e.preventDefault(); create.mutate(form, { onSuccess: (cat)=> nav(`/forum/category/${cat.id}`) }) }}>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Название</label>
          <input required value={form.name} onChange={e=> setForm(f=> ({...f,name:e.target.value}))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"/>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Описание</label>
            <textarea value={form.description} onChange={e=> setForm(f=> ({...f,description:e.target.value}))} className="min-h-[120px] w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"/>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Иконка (Text)</label>
            <input value={form.icon} onChange={e=> setForm(f=> ({...f,icon:e.target.value}))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"/>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Цвет</label>
            <input type="color" value={form.color} onChange={e=> setForm(f=> ({...f,color:e.target.value}))} className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-white/5"/>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Порядок отображения</label>
          <input type="number" value={form.displayOrder} onChange={e=> setForm(f=> ({...f,displayOrder:Number(e.target.value)}))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"/>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button disabled={create.isPending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
            {create.isPending ? 'Создание...' : 'Создать'}
          </button>
          <Link to="/forum" className="text-sm text-muted-foreground hover:text-white">Отмена</Link>
        </div>
        {create.error && <div className="text-xs text-red-400">Ошибка: {(create.error as any).message || 'Не удалось создать'}</div>}
      </form>
    </div>
  )
}

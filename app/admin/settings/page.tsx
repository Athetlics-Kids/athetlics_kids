'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Edit,
  Trash2,
  Settings2,
  Layers,
  CreditCard,
  MapPin,
  Home,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DashboardCard } from '@/components/dashboard'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import {
  fetchAcademySettings,
  fetchPlanConfigs,
  fetchStudentLevels,
} from '@/lib/supabase/data'
import {
  createLevel,
  createPlanConfig,
  deleteLevel,
  deletePlanConfig,
  updateAcademySettings,
  updateLevel,
  updatePlanConfig,
} from '@/lib/supabase/mutations'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatPlanConfigLabel } from '@/lib/locale'
import type { PlanConfig, PlanType, StudentLevel } from '@/types'

export default function SettingsPage() {
  const {
    data: levels = [],
    refetch: refetchLevels,
  } = useSupabaseLoader((client) => fetchStudentLevels(client))
  const {
    data: plans = [],
    refetch: refetchPlans,
  } = useSupabaseLoader((client) => fetchPlanConfigs(client))
  const {
    data: rates = { rateLocal: 30000, rateDomicilio: 50000 },
    refetch: refetchRates,
  } = useSupabaseLoader((client) => fetchAcademySettings(client))

  const [levelDialogOpen, setLevelDialogOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState<StudentLevel | null>(null)
  const [levelLabel, setLevelLabel] = useState('')
  const [levelOrder, setLevelOrder] = useState('0')
  const [levelActive, setLevelActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null)
  const [planLabel, setPlanLabel] = useState('')
  const [planPrice, setPlanPrice] = useState('')
  const [planMonths, setPlanMonths] = useState('1')
  const [planClassesWeek, setPlanClassesWeek] = useState('1')
  const [planType, setPlanType] = useState<PlanType>('monthly')
  const [planActive, setPlanActive] = useState(true)

  const [rateLocal, setRateLocal] = useState('')
  const [rateDomicilio, setRateDomicilio] = useState('')

  useEffect(() => {
    setRateLocal(String(rates.rateLocal))
    setRateDomicilio(String(rates.rateDomicilio))
  }, [rates.rateLocal, rates.rateDomicilio])

  const openCreateLevel = () => {
    setEditingLevel(null)
    setLevelLabel('')
    setLevelOrder(String((levels.length + 1) * 10))
    setLevelActive(true)
    setLevelDialogOpen(true)
  }

  const openEditLevel = (level: StudentLevel) => {
    setEditingLevel(level)
    setLevelLabel(level.label)
    setLevelOrder(String(level.sortOrder))
    setLevelActive(level.isActive)
    setLevelDialogOpen(true)
  }

  const saveLevel = async () => {
    if (!levelLabel.trim()) {
      toast.error('El nombre del nivel es obligatorio')
      return
    }
    setSaving(true)
    const client = createClient()
    const payload = {
      label: levelLabel,
      sortOrder: Number(levelOrder) || 0,
      isActive: levelActive,
    }
    const result = editingLevel
      ? await updateLevel(client, editingLevel.id, payload)
      : await createLevel(client, payload)
    setSaving(false)

    if (!result.ok) {
      toast.error(
        result.error.includes('student_levels') || result.error.includes('schema cache')
          ? 'Ejecuta las migraciones SQL en Supabase primero'
          : result.error
      )
      return
    }

    toast.success(editingLevel ? 'Nivel actualizado' : 'Nivel creado')
    setLevelDialogOpen(false)
    refetchLevels()
  }

  const removeLevel = async (level: StudentLevel) => {
    if (!confirm(`¿Eliminar el nivel "${level.label}"?`)) return
    const result = await deleteLevel(createClient(), level.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Nivel eliminado')
    refetchLevels()
  }

  const openCreatePlan = () => {
    setEditingPlan(null)
    setPlanLabel('Clase única')
    setPlanPrice('50000')
    setPlanMonths('1')
    setPlanClassesWeek('1')
    setPlanType('one_off')
    setPlanActive(true)
    setPlanDialogOpen(true)
  }

  const openEditPlan = (plan: PlanConfig) => {
    setEditingPlan(plan)
    setPlanLabel(plan.label)
    setPlanPrice(String(plan.price))
    setPlanMonths(String(plan.durationMonths))
    setPlanClassesWeek(String(plan.classesPerWeek ?? 1))
    setPlanType(plan.planType)
    setPlanActive(plan.isActive)
    setPlanDialogOpen(true)
  }

  const savePlan = async () => {
    if (!planLabel.trim() || !planPrice) {
      toast.error('Completa etiqueta y precio')
      return
    }
    setSaving(true)
    const client = createClient()
    const payload = {
      planType,
      label: planLabel,
      price: Number(planPrice),
      durationMonths: planType === 'one_off' ? 1 : Number(planMonths) || 1,
      classesPerWeek: planType === 'one_off' ? 1 : Number(planClassesWeek) || 1,
      isActive: planActive,
      sortOrder: editingPlan?.sortOrder ?? plans.length + 1,
    }
    const result = editingPlan
      ? await updatePlanConfig(client, editingPlan.id, payload)
      : await createPlanConfig(client, payload)
    setSaving(false)

    if (!result.ok) {
      toast.error(
        result.error.includes('plan_configs') || result.error.includes('schema cache')
          ? 'Ejecuta la migración SQL de contabilidad en Supabase primero'
          : result.error
      )
      return
    }

    toast.success(editingPlan ? 'Plan actualizado' : 'Plan creado')
    setPlanDialogOpen(false)
    refetchPlans()
  }

  const removePlan = async (plan: PlanConfig) => {
    if (!confirm(`¿Eliminar el plan "${plan.label}"?`)) return
    const result = await deletePlanConfig(createClient(), plan.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Plan eliminado')
    refetchPlans()
  }

  const saveRates = async () => {
    setSaving(true)
    const result = await updateAcademySettings(createClient(), {
      rateLocal: Number(rateLocal) || 0,
      rateDomicilio: Number(rateDomicilio) || 0,
    })
    setSaving(false)
    if (!result.ok) {
      toast.error(
        result.error.includes('academy_settings') || result.error.includes('schema cache')
          ? 'Ejecuta supabase/migrations/20260722000000_accounting.sql en Supabase'
          : result.error
      )
      return
    }
    toast.success('Tarifas de profesor guardadas')
    refetchRates()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          Configuración
        </h1>
        <p className="text-muted-foreground">
          Planes de alumnos, niveles y tarifas del profesor (local / domicilio)
        </p>
      </div>

      <Tabs defaultValue="rates" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="rates" className="gap-2">
            <MapPin className="h-4 w-4" />
            Tarifas profesor
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Planes alumnos
          </TabsTrigger>
          <TabsTrigger value="levels" className="gap-2">
            <Layers className="h-4 w-4" />
            Niveles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rates">
          <DashboardCard
            title="Pago al profesor por clase"
            description="Tarifa por clase. Proyección = clases del mes. Saldo pendiente = ejecutadas sin marcar Pagado."
          >
            <div className="grid gap-6 sm:grid-cols-2 max-w-2xl">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-primary" />
                  Clase en el local
                </div>
                <div className="grid gap-2">
                  <Label>Tarifa fija (COP)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={rateLocal}
                    onChange={(e) => setRateLocal(e.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Home className="h-4 w-4 text-secondary" />
                  Clase a domicilio
                </div>
                <div className="grid gap-2">
                  <Label>Tarifa fija (COP)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={rateDomicilio}
                    onChange={(e) => setRateDomicilio(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={saveRates} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar tarifas'}
              </Button>
            </div>
          </DashboardCard>
        </TabsContent>

        <TabsContent value="plans">
          <DashboardCard
            title="Planes de matrícula"
            description="Ejemplo: $180.000 = 1 clase/semana · $250.000 = 2 clases/semana (mensual). Al crear alumno se genera el pago con ese precio."
            action={
              <Button size="sm" onClick={openCreatePlan}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo plan
              </Button>
            }
          >
            <div className="space-y-2">
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No hay planes. Ejecuta la migración SQL o crea el primero.
                </p>
              ) : (
                plans.map((plan, i) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between rounded-lg border border-border p-4 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {formatPlanConfigLabel(plan.label, plan.price, plan.classesPerWeek)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {plan.classesPerWeek} clase{plan.classesPerWeek === 1 ? '' : 's'}/semana ·{' '}
                        {plan.durationMonths} mes{plan.durationMonths === 1 ? '' : 'es'} ·{' '}
                        {plan.isActive ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEditPlan(plan)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removePlan(plan)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </DashboardCard>
        </TabsContent>

        <TabsContent value="levels">
          <DashboardCard
            title="Niveles de alumnos"
            description="Estos valores aparecen en el campo Nivel al crear o editar un alumno (y en clases)"
            action={
              <Button size="sm" onClick={openCreateLevel}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar nivel
              </Button>
            }
          >
            <div className="space-y-2">
              {levels.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No hay niveles. Ejecuta la migración SQL o agrega el primero.
                </p>
              ) : (
                levels.map((level, i) => (
                  <motion.div
                    key={level.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="font-medium">{level.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Orden: {level.sortOrder} · {level.isActive ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditLevel(level)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeLevel(level)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </DashboardCard>
        </TabsContent>
      </Tabs>

      <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLevel ? 'Editar nivel' : 'Nuevo nivel'}</DialogTitle>
            <DialogDescription>
              Este nivel aparecerá en formularios de alumnos y clases
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input
                value={levelLabel}
                onChange={(e) => setLevelLabel(e.target.value)}
                placeholder="Ej. Pre-avanzado"
              />
            </div>
            <div className="grid gap-2">
              <Label>Orden</Label>
              <Input
                type="number"
                value={levelOrder}
                onChange={(e) => setLevelOrder(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={levelActive} onCheckedChange={setLevelActive} id="level-active" />
              <Label htmlFor="level-active">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLevelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveLevel} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar plan' : 'Nuevo plan'}</DialogTitle>
            <DialogDescription>
              Define precio y cuántas clases por semana incluye (ej. 1 o 2)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nombre del plan</Label>
              <Input
                value={planLabel}
                onChange={(e) => setPlanLabel(e.target.value)}
                placeholder="Mensual · 2 clases/semana"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Precio (COP)</Label>
                <Input
                  type="number"
                  min={0}
                  value={planPrice}
                  onChange={(e) => setPlanPrice(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Clases por semana</Label>
                <Input
                  type="number"
                  min={1}
                  max={14}
                  value={planClassesWeek}
                  onChange={(e) => setPlanClassesWeek(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Duración (meses)</Label>
                <Input
                  type="number"
                  min={1}
                  value={planMonths}
                  onChange={(e) => setPlanMonths(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Ciclo de facturación</Label>
                <Select
                  value={planType}
                  onValueChange={(v) => setPlanType(v as PlanType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="semiannual">Semestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                    <SelectItem value="one_off">Clase única (1 clase)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={planActive} onCheckedChange={setPlanActive} id="plan-active" />
              <Label htmlFor="plan-active">Activo (visible en formularios)</Label>
            </div>
            {planPrice && (
              <p className="text-sm text-muted-foreground rounded-md bg-muted/50 p-3">
                {planType === 'one_off' ? (
                  <>
                    Resumen: <strong>1 sola clase</strong> por{' '}
                    <strong>{formatCurrency(Number(planPrice) || 0)}</strong>
                  </>
                ) : (
                  <>
                    Resumen: el alumno paga{' '}
                    <strong>{formatCurrency(Number(planPrice) || 0)}</strong> por{' '}
                    {planMonths || 1} mes(es), con{' '}
                    <strong>{planClassesWeek || 1} clase(s) por semana</strong>
                    {' '}(~{(Number(planClassesWeek) || 1) * 4 * (Number(planMonths) || 1)} clases
                    aprox. en el periodo).
                  </>
                )}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={savePlan} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

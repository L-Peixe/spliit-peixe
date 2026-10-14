import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Locale } from '@/i18n/request'
import { useAnalytics } from '@/lib/analytics/context'
import { getGroup } from '@/lib/api'
import { defaultCurrencyList, getCurrency } from '@/lib/currency'
import { formatNumberBR } from '@/lib/number-br'
import {
  GROUP_INFORMATION_MAX,
  GroupFormInput,
  GroupFormValues,
  groupFormSchema,
} from '@/lib/schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { CurrencySelector } from './currency-selector'
import { GroupDefaultSplit } from './group-default-split'
import { Textarea } from './ui/textarea'

export type Props = {
  group?: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  onSubmit: (
    groupFormValues: GroupFormValues,
    participantId?: string,
  ) => Promise<void>
  protectedParticipantIds?: string[]
  /** Resolved on the server, since the runtime variable is not public. */
  defaultCurrencyCode?: string
}

export function GroupForm({
  group,
  onSubmit,
  protectedParticipantIds = [],
  defaultCurrencyCode = 'USD',
}: Props) {
  const locale = useLocale()
  const t = useTranslations('GroupForm')
  const form = useForm<GroupFormInput, any, GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: group
      ? {
          name: group.name,
          information: group.information ?? '',
          currency: group.currency ?? '',
          currencyCode: group.currencyCode ?? '',
          participants: group.participants.map((p) => ({
            ...p,
            defaultShares: formatNumberBR(p.defaultShares / 100),
          })),
          defaultSplitMode:
            group.defaultSplitMode as GroupFormValues['defaultSplitMode'],
        }
      : {
          name: '',
          information: '',
          currency: '',
          currencyCode: defaultCurrencyCode,
          defaultSplitMode: 'EVENLY',
          participants: [
            { name: t('Participants.John') },
            { name: t('Participants.Jane') },
            { name: t('Participants.Jack') },
          ],
        },
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'participants',
    keyName: 'key',
  })
  const sendEvent = useAnalytics()

  // "Quem é você neste grupo?" — by field key, so renaming or removing other
  // participants keeps the choice. New group: the first name.
  const [activeKey, setActiveKey] = useState<string | null>(null)
  useEffect(() => {
    if (activeKey !== null) return
    const stored = group && localStorage.getItem(`${group.id}-activeUser`)
    setActiveKey(
      (group ? fields.find((f) => f.id === stored) : fields[0])?.key ?? '',
    )
  }, [activeKey, fields, group])
  const activeIndex = fields.findIndex((f) => f.key === activeKey)
  const activeUser =
    activeIndex === -1
      ? undefined
      : form.watch(`participants.${activeIndex}.name`)

  // By id: a renamed participant is still you. Someone added in this edit has
  // no id yet; ExpenseList maps `<groupId>-newUser` from the name once saved.
  const activeId = activeIndex === -1 ? undefined : fields[activeIndex].id
  const updateActiveUser = () => {
    if (!activeUser) return
    if (group?.id) {
      if (activeId) {
        localStorage.setItem(`${group.id}-activeUser`, activeId)
      } else {
        localStorage.setItem(`${group.id}-newUser`, activeUser)
      }
    } else {
      localStorage.setItem('newGroup-activeUser', activeUser)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          if (group) {
            sendEvent(
              { event: 'group: update', props: {} },
              `/groups/${group.id}/edit`,
            )
          } else {
            sendEvent({ event: 'group: create', props: {} }, `/groups`)
          }
          await onSubmit(values, activeId)
        })}
      >
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('NameField.label')}</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base"
                      placeholder={t('NameField.placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('NameField.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currencyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('CurrencyCodeField.label')}</FormLabel>
                  <CurrencySelector
                    currencies={defaultCurrencyList(
                      locale as Locale,
                      t('CurrencyCodeField.customOption'),
                    )}
                    defaultValue={form.watch(field.name) ?? ''}
                    onValueChange={(newCurrency) => {
                      field.onChange(newCurrency)
                      const currency = getCurrency(newCurrency)
                      if (
                        currency.code.length ||
                        form.getFieldState('currency').isTouched
                      )
                        form.setValue('currency', currency.symbol, {
                          shouldValidate: true,
                          shouldTouch: true,
                          shouldDirty: true,
                        })
                    }}
                    isLoading={false}
                  />
                  <FormDescription>
                    {t(
                      group
                        ? 'CurrencyCodeField.editDescription'
                        : 'CurrencyCodeField.createDescription',
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem hidden={!!form.watch('currencyCode')?.length}>
                  <FormLabel>{t('CurrencyField.label')}</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base"
                      placeholder={t('CurrencyField.placeholder')}
                      max={5}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('CurrencyField.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="col-span-2">
              <FormField
                control={form.control}
                name="information"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('InformationField.label')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        className="text-base"
                        maxLength={GROUP_INFORMATION_MAX}
                        {...field}
                        placeholder={t('InformationField.placeholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t('Participants.title')}</CardTitle>
            <CardDescription>{t('Participants.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {fields.map((item, index) => (
                <li key={item.key}>
                  <FormField
                    control={form.control}
                    name={`participants.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">
                          Participant #{index + 1}
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              className="text-base"
                              {...field}
                              placeholder={t('Participants.new')}
                            />
                            {item.id &&
                            protectedParticipantIds.includes(item.id) ? (
                              <HoverCard>
                                <HoverCardTrigger>
                                  <Button
                                    variant="ghost"
                                    className="text-destructive-"
                                    type="button"
                                    size="icon"
                                    disabled
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive opacity-50" />
                                  </Button>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  align="end"
                                  className="text-sm"
                                >
                                  {t('Participants.protectedParticipant')}
                                </HoverCardContent>
                              </HoverCard>
                            ) : (
                              <Button
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => remove(index)}
                                type="button"
                                size="icon"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              variant="secondary"
              onClick={() => {
                append({
                  name: '',
                  defaultShares:
                    form.getValues('defaultSplitMode') === 'BY_PERCENTAGE'
                      ? '0'
                      : '1',
                })
              }}
              type="button"
            >
              {t('Participants.add')}
            </Button>
          </CardFooter>
        </Card>

        <GroupDefaultSplit form={form} />

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t('Settings.ActiveUserField.label')}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeKey !== null && (
              <RadioGroup
                value={activeKey}
                onValueChange={setActiveKey}
                aria-label={t('Settings.ActiveUserField.label')}
              >
                {fields.map((field, index) => {
                  const name = form.watch(`participants.${index}.name`)
                  if (!name) return null
                  return (
                    <div key={field.key} className="flex items-center gap-2">
                      <RadioGroupItem
                        value={field.key}
                        id={`active-${field.key}`}
                      />
                      <Label
                        htmlFor={`active-${field.key}`}
                        className="flex-1 py-1 font-normal"
                      >
                        {name}
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        <div className="flex mt-4 gap-2">
          <SubmitButton
            loadingContent={t(group ? 'Settings.saving' : 'Settings.creating')}
            onClick={updateActiveUser}
          >
            <Save className="w-4 h-4 mr-2" />{' '}
            {t(group ? 'Settings.save' : 'Settings.create')}
          </SubmitButton>
          {!group && (
            <Button variant="ghost" asChild>
              <Link href="/groups">{t('Settings.cancel')}</Link>
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}

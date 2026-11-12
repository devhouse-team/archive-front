// Opt-in synthetic volume for the mock (Stage 11b): MOCK_BULK_DELA=1 adds a third фонд with 44 cases, so /dela
// has a second page, a 13-leaf «Пропуски» case and an опись that holds only restricted cases (editors see it;
// reader and operator must not). Off by default, so the fixture-based tests and other screens are unchanged.
// The added cases have page rows but no page bodies: opening one of their leaves gives the normal 404.
import type { DeloDetail, DeloPage, EaisCase, Lang } from '../../app/types/api'
import type { MockFixtures } from './core'

const FOND = 3
const CREATOR = 'Акмолинский городской отдел здравоохранения'
const TITLES = [
  'Отчёты больниц города',
  'Приказы по личному составу',
  'Переписка с областным отделом здравоохранения',
  'Сведения о медицинских кадрах',
  'Сметы и штатные расписания',
  'Протоколы врачебных совещаний',
]
const DOC_TYPES = ['отчёты', 'приказы', 'переписка', 'сведения', 'сметы', 'протоколы']
const LANGS: Lang[] = ['ru', 'ru', 'kk-cyrl', 'ru']
/** 13 missing leaves: 4, 7–8, 10–17, 20–21. */
const MANY_GAPS = [4, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21]

export function withBulkDela(fixtures: MockFixtures): MockFixtures {
  const dela: DeloDetail[] = [...fixtures.dela]
  const eaisCases: EaisCase[] = [...fixtures.eaisCases]
  let deloId = 5000
  let caseId = 5000
  let pageId = 90000
  const plan: Array<{ opis: number, count: number, access: 'open' | 'restricted' }> = [
    { opis: 1, count: 30, access: 'open' },
    { opis: 2, count: 12, access: 'open' },
    { opis: 3, count: 2, access: 'restricted' },
  ]
  for (const { opis, count, access } of plan) {
    for (let delo = 1; delo <= count; delo++) {
      const k = (opis * 31 + delo) % TITLES.length
      const title = access === 'restricted' ? 'Личные дела врачей' : TITLES[k]!
      const year = 1945 + ((opis * 7 + delo) % 20)
      const gaps = delo % 7 === 0 ? MANY_GAPS : delo % 5 === 0 ? [3] : []
      const leaves = gaps.length ? Math.max(...gaps) + 2 : 2 + (delo % 4)
      const lang = LANGS[delo % LANGS.length]!
      const pages: DeloPage[] = []
      for (let leaf = 1; leaf <= leaves; leaf++) {
        if (gaps.includes(leaf)) continue
        const low = delo % 3 === 0 && leaf <= 2
        pages.push({
          id: ++pageId, leaf, lang, mean_conf: low ? 52 : 91, low_conf: low ? 1 : 0, reviewed: 0,
          status: delo % 11 === 0 && leaf === 1 ? 'failed' : 'done', script: 'Cyrillic', engine: 'tesseract',
        })
      }
      const id = ++caseId
      eaisCases.push({
        id, fond: FOND, opis, delo, title, year_from: year, year_to: year, fond_creator: CREATOR,
        doc_type: DOC_TYPES[k]!, access, files: [],
      })
      dela.push({
        id: ++deloId, fond: FOND, opis, delo, shifr: `Ф.${FOND} Оп.${opis} Д.${delo}`, eais_case_id: id,
        title, year_from: year, year_to: year, years: String(year), fond_creator: CREATOR, doc_type: DOC_TYPES[k]!,
        access, lang_override: null, pages_total: pages.length, pages_done: 0, pages_failed: 0, gaps, low_conf: 0,
        pages,
      })
    }
  }
  return { ...fixtures, dela, eaisCases }
}

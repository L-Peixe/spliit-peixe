import { suggestCategory } from './suggest-category'

describe('suggestCategory', () => {
  it.each([
    ['Uber pra casa', 35],
    ['99 Táxi', 35],
    ['iFood jantar', 8],
    ["McDonald's", 8],
    ['Mercado', 9],
    ['ASSAI atacadista', 9],
    ['Carrefour', 9],
    ['Netflix', 2],
    ['Spotify', 2],
    ['Presente', 0],
    ['Paguei 990', 0],
  ])('%s → %i', (title, id) => {
    expect(suggestCategory(title)).toBe(id)
  })
})

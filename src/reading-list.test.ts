import { describe, expect, it } from 'vitest'
import { add, empty, remove, summary, toggle, visible } from './reading-list'

describe('reading list', () => {
  it('adds trimmed titles and refuses blanks and duplicates', () => {
    let list = add(empty(), '  Dune ')
    list = add(list, '')
    list = add(list, 'dune')
    expect(list.items).toEqual([ { id: 1, title: 'Dune', read: false } ])
  })

  it('toggles an item and filters by status', () => {
    let list = add(add(empty(), 'Dune'), 'Emma')
    list = toggle(list, 1)
    expect(visible(list, 'read').map(item => item.title)).toEqual([ 'Dune' ])
    expect(visible(list, 'unread').map(item => item.title)).toEqual([ 'Emma' ])
    expect(visible(list, 'all')).toHaveLength(2)
  })

  it('removes a book, keeps ids unused, and lets the title be added again', () => {
    const list = toggle(add(add(empty(), 'Dune'), 'Emma'), 1)
    const left = remove(list, 1)
    expect(left.items).toEqual([ { id: 2, title: 'Emma', read: false } ])
    expect(summary(left)).toBe('1 of 1 unread')
    expect(left.nextId).toBe(3)
    expect(add(left, 'dune').items.map(item => [ item.id, item.title ])).toEqual([ [ 2, 'Emma' ], [ 3, 'dune' ] ])
    expect(remove(list, 99)).toBe(list)
  })

  it('summarizes what is left to read', () => {
    expect(summary(toggle(add(add(empty(), 'Dune'), 'Emma'), 2))).toBe('1 of 2 unread')
  })
})

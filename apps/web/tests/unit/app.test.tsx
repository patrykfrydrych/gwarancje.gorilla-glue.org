import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../../src/App'

describe('App', () => {
  it('renderuje nazwe aplikacji w naglowku', () => {
    render(<App />)
    expect(screen.getByText('Gwarancje', { selector: '.brand__name' })).toBeInTheDocument()
  })
})

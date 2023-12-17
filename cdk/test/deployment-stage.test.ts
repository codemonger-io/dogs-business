import { isDeploymentStage } from '../lib/deployment-stage'

describe('isDeploymentStage', () => {
  it('should be true for "development"', () => {
    expect(isDeploymentStage('development')).toBe(true)
  })

  it('should be true for "production"', () => {
    expect(isDeploymentStage('production')).toBe(true)
  })

  it('should be false for "開発"', () => {
    expect(isDeploymentStage('開発')).toBe(false)
  })
})

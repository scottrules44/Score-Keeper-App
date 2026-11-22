Pod::Spec.new do |s|
  s.name           = 'ProStore'
  s.version        = '1.0.0'
  s.summary        = 'StoreKit 2 bridge for the one-time Pro purchase'
  s.description    = 'Buys, restores and verifies the non-consumable Pro unlock with StoreKit 2.'
  s.author         = 'Scott Harrison'
  s.homepage       = 'https://github.com/scottharrison/score-keeper'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.license        = { :type => 'MIT' }
  s.frameworks     = 'StoreKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end

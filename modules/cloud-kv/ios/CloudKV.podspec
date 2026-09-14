Pod::Spec.new do |s|
  s.name           = 'CloudKV'
  s.version        = '1.0.0'
  s.summary        = 'iCloud key-value storage for the usage meter'
  s.description    = 'Bridges NSUbiquitousKeyValueStore so free-tier usage survives reinstalls.'
  s.author         = 'Scott Harrison'
  s.homepage       = 'https://github.com/scottharrison/score-keeper'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.license        = { :type => 'MIT' }

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end

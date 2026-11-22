Pod::Spec.new do |s|
  s.name           = 'FirebaseAnalyticsBridge'
  s.version        = '1.0.0'
  s.summary        = 'Google Analytics for Firebase bridge'
  s.description    = 'Configures Firebase from the bundled GoogleService-Info.plist and logs Analytics events.'
  s.author         = 'Scott Harrison'
  s.homepage       = 'https://github.com/scottharrison/score-keeper'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.dependency 'FirebaseCore'
  s.dependency 'FirebaseAnalytics/Core'
  s.license        = { :type => 'MIT' }

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  # Copied into the app bundle, where FirebaseApp.configure() looks for it.
  s.resources = ['GoogleService-Info.plist']
end

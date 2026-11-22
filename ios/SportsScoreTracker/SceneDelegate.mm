#import "SceneDelegate.h"
#import "AppDelegate.h"

#import <React/RCTLinkingManager.h>
#import <React/RCTConstants.h>

@implementation SceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                 options:(UISceneConnectionOptions *)connectionOptions
{
  if (![scene isKindOfClass:[UIWindowScene class]]) {
    return;
  }
  UIWindowScene *windowScene = (UIWindowScene *)scene;
  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;

  UIView *rootView = [appDelegate.rootViewFactory viewWithModuleName:appDelegate.moduleName
                                                   initialProperties:appDelegate.initialProps
                                                       launchOptions:nil];
  UIViewController *rootViewController = [appDelegate createRootViewController];
  [appDelegate setRootView:rootView toRootViewController:rootViewController];

  self.window = [[UIWindow alloc] initWithWindowScene:windowScene];
  self.window.rootViewController = rootViewController;
  appDelegate.window = self.window;
  [self.window makeKeyAndVisible];

  // Cold-start deep links / universal links arrive here instead of the app delegate.
  for (UIOpenURLContext *context in connectionOptions.URLContexts) {
    [RCTLinkingManager application:UIApplication.sharedApplication openURL:context.URL options:@{}];
  }
  for (NSUserActivity *activity in connectionOptions.userActivities) {
    [RCTLinkingManager application:UIApplication.sharedApplication
              continueUserActivity:activity
                restorationHandler:^(NSArray *_Nullable restorableObjects){}];
  }
}

- (void)scene:(UIScene *)scene openURLContexts:(NSSet<UIOpenURLContext *> *)URLContexts
{
  for (UIOpenURLContext *context in URLContexts) {
    [RCTLinkingManager application:UIApplication.sharedApplication openURL:context.URL options:@{}];
  }
}

- (void)scene:(UIScene *)scene continueUserActivity:(NSUserActivity *)userActivity
{
  [RCTLinkingManager application:UIApplication.sharedApplication
            continueUserActivity:userActivity
              restorationHandler:^(NSArray *_Nullable restorableObjects){}];
}

// Keeps Dimensions / useWindowDimensions in sync on rotation and iPad resizing.
- (void)windowScene:(UIWindowScene *)windowScene
    didUpdateCoordinateSpace:(id<UICoordinateSpace>)previousCoordinateSpace
        interfaceOrientation:(UIInterfaceOrientation)previousInterfaceOrientation
             traitCollection:(UITraitCollection *)previousTraitCollection
{
  [[NSNotificationCenter defaultCenter] postNotificationName:RCTWindowFrameDidChangeNotification
                                                      object:UIApplication.sharedApplication.delegate];
}

@end
